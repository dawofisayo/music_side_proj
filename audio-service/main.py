from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from urllib.parse import urlparse, parse_qs
import yt_dlp
import tempfile
import os
from acrcloud.recognizer import ACRCloudRecognizer
import json

from whosampled import search_whosampled


load_dotenv()


def clean_youtube_url(url: str) -> str:
    """Strip playlist and other parameters, keep only video ID"""
    parsed = urlparse(url)
    params = parse_qs(parsed.query)
    
    if 'v' in params:
        return f"https://www.youtube.com/watch?v={params['v'][0]}"
    
    if 'youtu.be' in parsed.netloc:
        video_id = parsed.path.lstrip('/')
        return f"https://www.youtube.com/watch?v={video_id}"
    
    return url
app = FastAPI()

# emable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# configure acrcloud recognizer
config = {
    "host": os.getenv("ACR_HOST"),
    "access_key": os.getenv("ACR_ACCESS_KEY"),
    "access_secret": os.getenv("ACR_ACCESS_SECRET"),
    "timeout": 10,
}
recognizer = ACRCloudRecognizer(config)



@app.get("/health")
def health_check():
    return {"message": "ok", "service": "audio-service"}


@app.post("/recognize/youtube")
async def recognize_from_youtube(url: str):
    """Recognize audio from YouTube URL"""
    url = clean_youtube_url(url)
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            audio_template = os.path.join(temp_dir, 'audio.%(ext)s')
            
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': audio_template,
                'quiet': True,
                'no_warnings': True,
                'noplaylist': True,
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                }]
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
            
            audio_file = os.path.join(temp_dir, 'audio.mp3')
            
            if not os.path.exists(audio_file):
                raise HTTPException(status_code=500, detail="Audio file not found")
            
            with open(audio_file, 'rb') as f:
                audio_data = f.read()
            
            # Send to ACRCloud
            result = recognizer.recognize_by_filebuffer(audio_data, 0)
            result_dict = json.loads(result)
            
            if result_dict['status']['code'] == 0:
                music = result_dict['metadata']['music'][0]
                track_info = {
                    "title": music.get('title'),
                    "artist": music['artists'][0]['name'] if music.get('artists') else None,
                    "album": music.get('album', {}).get('name'),
                    "release_date": music.get('release_date'),
                    "duration": music.get('duration_ms'),
                    "score": music.get('score', 100),
                    "spotify_id": music.get('external_metadata', {}).get('spotify', {}).get('track', {}).get('id'),
                    "isrc": music.get('external_ids', {}).get('isrc')
                }
                
                # Get sample information from WhoSampled (optional - gracefully handle if FlareSolverr not available)
                try:
                    sample_data = await search_whosampled(track_info['title'], track_info['artist'])
                    print(f"[Main] WhoSampled result: {len(sample_data.get('samples', []))} samples, {len(sample_data.get('sampled_by', []))} sampled_by", flush=True)
                except Exception as e:
                    print(f"[Main] WhoSampled error (non-fatal): {type(e).__name__}: {str(e)}", flush=True)
                    sample_data = {"sampled_by": [], "samples": []}
                
                return {
                    "success": True,
                    "track": track_info,
                    "samples": sample_data
                }
            else:
                return {"success": False, "message": "Song not recognized"}
                
    except Exception as e:
        print(f"[Main] Error: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/recognize/file")
async def recognize_audio_file(file: UploadFile = File(...)):
    try:
        ## recognize audio from uploaded file content
        content = await file.read()
        
        ## send to acrcloud recognizer (start_seconds=0 means start from beginning)
        result = recognizer.recognize_by_filebuffer(content, 0)
        resultdict = json.loads(result)
        
        ## check if we got a match
        if resultdict["status"]["code"] == 0:
            music = resultdict["metadata"]["music"][0]
            track_info = {
                "title": music.get('title'),
                "artist": music['artists'][0]['name'] if music.get('artists') else None,
                "album": music.get('album', {}).get('name'),
                "release_date": music.get('release_date'),
                "duration": music.get('duration_ms'),
                "score": music.get('score', 100),
                "spotify_id": music.get('external_metadata', {}).get('spotify', {}).get('track', {}).get('id'),
                "isrc": music.get('external_ids', {}).get('isrc')
            }
            
            # Get sample information from WhoSampled (optional - gracefully handle if FlareSolverr not available)
            try:
                sample_data = await search_whosampled(track_info['title'], track_info['artist'])
                print(f"[Main] WhoSampled result: {len(sample_data.get('samples', []))} samples, {len(sample_data.get('sampled_by', []))} sampled_by", flush=True)
            except Exception as e:
                print(f"[Main] WhoSampled error (non-fatal): {type(e).__name__}: {str(e)}", flush=True)
                sample_data = {"sampled_by": [], "samples": []}
            
            return {
                "success": True,
                "track": track_info,
                "samples": sample_data
            }
        else:
            return {"success": False, "message": "Song not recognized"}

    except Exception as e:
        print(f"[Main] Error: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/youtube/audio/{youtube_id}")
async def get_youtube_audio(youtube_id: str):
    """Extract and stream audio from YouTube video"""
    try:
        url = f"https://www.youtube.com/watch?v={youtube_id}"
        
        with tempfile.TemporaryDirectory() as temp_dir:
            audio_template = os.path.join(temp_dir, 'audio.%(ext)s')
            
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': audio_template,
                'quiet': True,
                'no_warnings': True,
                'noplaylist': True,
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                }]
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
            
            audio_file = os.path.join(temp_dir, 'audio.mp3')
            
            if not os.path.exists(audio_file):
                raise HTTPException(status_code=500, detail="Audio file not found")
            
            from fastapi.responses import FileResponse
            return FileResponse(
                audio_file,
                media_type="audio/mpeg",
                filename=f"{youtube_id}.mp3"
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8001))  # Use Fly's PORT env var
    uvicorn.run(app, host="0.0.0.0", port=port)
