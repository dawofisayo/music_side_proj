import requests
from bs4 import BeautifulSoup
import re
import os

# FlareSolverr URL - can be configured via env var
FLARESOLVERR_URL = os.getenv("FLARESOLVERR_URL", "http://localhost:8191/v1")

def clean_track_title(title: str) -> str:
    """Remove common suffixes like (Radio Edit), (Remastered), etc."""
    patterns = [
        r'\s*\(Radio Edit\)',
        r'\s*\(Album Version\)',
        r'\s*\(Remastered.*?\)',
        r'\s*\(Remaster\)',
        r'\s*\(Original.*?\)',
        r'\s*\(Single Version\)',
        r'\s*\(Edit\)',
        r'\s*\(Clean\)',
        r'\s*\(Explicit\)',
        r'\s*\(feat\..*?\)',
        r'\s*\(ft\..*?\)',
        r'\s*\[.*?\]',
    ]
    
    cleaned = title
    for pattern in patterns:
        cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)
    
    return cleaned.strip()

def slugify(text: str) -> str:
    """Convert text to URL-friendly slug"""
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text).strip('-')
    return text.title().replace(' ', '-')

def fetch_with_flaresolverr(url: str, max_timeout: int = 120000, retries: int = 2) -> str:
    """Fetch a URL using FlareSolverr to bypass Cloudflare with retry logic"""
    flaresolverr_host = FLARESOLVERR_URL.split('/v1')[0] if '/v1' in FLARESOLVERR_URL else FLARESOLVERR_URL
    
    for attempt in range(retries + 1):
        try:
            if attempt > 0:
                print(f"[WhoSampled] Retry attempt {attempt}/{retries} for {url}", flush=True)
            else:
                print(f"[WhoSampled] Fetching {url} via FlareSolverr at: {flaresolverr_host}", flush=True)
            
            payload = {
                "cmd": "request.get",
                "url": url,
                "maxTimeout": max_timeout,
                "returnOnlyCookies": False
            }
            
            # Increase timeout to match maxTimeout (120 seconds = 120000ms) + buffer
            response = requests.post(FLARESOLVERR_URL, json=payload, timeout=150)
            
            if not response.ok:
                error_text = response.text[:500] if response.text else "No error message"
                print(f"[WhoSampled] FlareSolverr HTTP error: {response.status_code} - {error_text}", flush=True)
                if attempt < retries:
                    continue
                return ""
            
            data = response.json()
            
            if data.get("status") == "ok":
                solution = data.get("solution", {})
                response_html = solution.get("response", "")
                if response_html:
                    print(f"[WhoSampled] Successfully fetched {len(response_html)} bytes from {url}", flush=True)
                return response_html
            else:
                error_msg = data.get('message', 'Unknown error')
                print(f"[WhoSampled] FlareSolverr error: {error_msg}", flush=True)
                # Log full response for debugging if available
                if data.get('status') == 'error':
                    print(f"[WhoSampled] Full error response: {str(data)[:500]}", flush=True)
                
                # Retry on "Application failed to respond" errors
                if "failed to respond" in error_msg.lower() and attempt < retries:
                    print(f"[WhoSampled] Retrying due to application timeout...", flush=True)
                    continue
                
                return ""
                
        except requests.exceptions.ConnectionError as e:
            print(f"[WhoSampled] FlareSolverr connection error: Cannot connect to {FLARESOLVERR_URL}. Is FlareSolverr deployed and FLARESOLVERR_URL set correctly?", flush=True)
            return ""
        except requests.exceptions.Timeout:
            print(f"[WhoSampled] FlareSolverr timeout: Request took longer than 150 seconds", flush=True)
            if attempt < retries:
                continue
            return ""
        except requests.exceptions.JSONDecodeError as e:
            print(f"[WhoSampled] FlareSolverr JSON decode error: {str(e)}. Response: {response.text[:200] if 'response' in locals() else 'N/A'}", flush=True)
            return ""
        except Exception as e:
            print(f"[WhoSampled] FlareSolverr error: {type(e).__name__}: {str(e)}", flush=True)
            if attempt < retries:
                continue
            return ""
    
    return ""

def parse_table_rows(rows, limit: int = None) -> list:
    """Parse table rows and extract track info. No limit by default."""
    results = []
    rows_to_parse = rows[:limit] if limit else rows
    for row in rows_to_parse:
        track_cell = row.select_one("td.tdata__td2 a.trackName")
        artist_cell = row.select_one("td.tdata__td3 a")
        
        if track_cell and artist_cell:
            title = track_cell.get_text(strip=True)
            artist = artist_cell.get_text(strip=True)
            entry = {"title": title, "artist": artist}
            if entry not in results:
                results.append(entry)
    return results

def parse_main_page(html: str) -> dict:
    """Parse the main track page for sample info and counts"""
    soup = BeautifulSoup(html, "html.parser")
    
    samples = []
    sampled_by = []
    samples_count = 0
    sampled_count = 0
    
    subsections = soup.find_all("section", class_="subsection")
    
    for subsection in subsections:
        header = subsection.find("h3", class_="section-header-title")
        if not header:
            continue
        
        header_text = header.get_text(strip=True).lower()
        rows = subsection.select("table.tdata tbody tr")
        
        # Extract count from header
        match = re.search(r'(\d+)', header_text)
        count = int(match.group(1)) if match else len(rows)
        
        if "contains sample" in header_text:
            samples = parse_table_rows(rows)  # Get all from main page
            samples_count = count
        elif "sampled in" in header_text:
            sampled_by = parse_table_rows(rows)  # Get all from main page
            sampled_count = count
    
    return {
        "samples": samples,
        "sampled_by": sampled_by,
        "samples_count": samples_count,
        "sampled_count": sampled_count
    }

def parse_list_page(html: str) -> list:
    """Parse a samples or sampled list page - returns all entries"""
    soup = BeautifulSoup(html, "html.parser")
    rows = soup.select("table.tdata tbody tr")
    return parse_table_rows(rows)

async def search_whosampled(track_title: str, artist_name: str) -> dict:
    """Search WhoSampled for sample information using FlareSolverr"""
    clean_title = clean_track_title(track_title)
    
    artist_slug = slugify(artist_name)
    track_slug = slugify(clean_title)
    base_url = f"https://www.whosampled.com/{artist_slug}/{track_slug}"
    
    main_url = f"{base_url}/"
    main_html = fetch_with_flaresolverr(main_url)
    
    if not main_html:
        return {"sampled_by": [], "samples": []}
    
    data = parse_main_page(main_html)
    samples = data["samples"]
    sampled_by = data["sampled_by"]
    
    if data["samples_count"] > 3:
        samples_url = f"{base_url}/samples/"
        samples_html = fetch_with_flaresolverr(samples_url)
        if samples_html:
            samples = parse_list_page(samples_html)
    
    if data["sampled_count"] > 3:
        sampled_url = f"{base_url}/sampled/"
        sampled_html = fetch_with_flaresolverr(sampled_url)
        if sampled_html:
            sampled_by = parse_list_page(sampled_html)
    
    return {"sampled_by": sampled_by, "samples": samples}
