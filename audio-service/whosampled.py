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

def fetch_with_flaresolverr(url: str, max_timeout: int = 60000) -> str:
    """Fetch a URL using FlareSolverr to bypass Cloudflare"""
    try:
        payload = {
            "cmd": "request.get",
            "url": url,
            "maxTimeout": max_timeout
        }
        
        response = requests.post(FLARESOLVERR_URL, json=payload, timeout=120)
        data = response.json()
        
        if data.get("status") == "ok":
            return data.get("solution", {}).get("response", "")
        else:
            print(f"[WhoSampled] FlareSolverr error: {data.get('message')}", flush=True)
            return ""
            
    except requests.exceptions.ConnectionError:
        print("[WhoSampled] FlareSolverr not running.", flush=True)
        return ""
    except Exception as e:
        print(f"[WhoSampled] FlareSolverr error: {e}", flush=True)
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
    print(f"[WhoSampled] Looking up: {track_title} by {artist_name}", flush=True)
    
    # Clean up track title
    clean_title = clean_track_title(track_title)
    if clean_title != track_title:
        print(f"[WhoSampled] Cleaned title: {clean_title}", flush=True)
    
    artist_slug = slugify(artist_name)
    track_slug = slugify(clean_title)
    base_url = f"https://www.whosampled.com/{artist_slug}/{track_slug}"
    
    # Fetch main page first
    main_url = f"{base_url}/"
    print(f"[WhoSampled] Fetching: {main_url}", flush=True)
    main_html = fetch_with_flaresolverr(main_url)
    
    if not main_html:
        return {"sampled_by": [], "samples": []}
    
    # Parse main page (gets up to 3 entries per section)
    data = parse_main_page(main_html)
    samples = data["samples"]
    sampled_by = data["sampled_by"]
    
    print(f"[WhoSampled] Main page: {data['samples_count']} samples, {data['sampled_count']} sampled_by", flush=True)
    
    # If more than 3 samples exist, fetch the full samples page
    if data["samples_count"] > 3:
        samples_url = f"{base_url}/samples/"
        print(f"[WhoSampled] Fetching samples page: {samples_url}", flush=True)
        samples_html = fetch_with_flaresolverr(samples_url)
        if samples_html:
            samples = parse_list_page(samples_html)
    
    # If more than 3 sampled_by exist, fetch the full sampled page
    if data["sampled_count"] > 3:
        sampled_url = f"{base_url}/sampled/"
        print(f"[WhoSampled] Fetching sampled page: {sampled_url}", flush=True)
        sampled_html = fetch_with_flaresolverr(sampled_url)
        if sampled_html:
            sampled_by = parse_list_page(sampled_html)
    
    print(f"[WhoSampled] Final - sampled_by: {len(sampled_by)}, samples: {len(samples)}", flush=True)
    if samples:
        print(f"[WhoSampled] Samples: {samples}", flush=True)
    if sampled_by:
        print(f"[WhoSampled] Sampled by: {sampled_by}", flush=True)
    
    return {"sampled_by": sampled_by, "samples": samples}
