from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from urllib.parse import urlparse, parse_qs
import yt_dlp
import tempfile
import os
from acrcloud.recognizer import ACRCloudRecognizer
import json

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
                music_list = result_dict['metadata']['music']
                tracks = []
                for music in music_list:
                    tracks.append({
                        "title": music.get('title'),
                        "artist": music['artists'][0]['name'] if music.get('artists') else None,
                        "album": music.get('album', {}).get('name'),
                        "release_date": music.get('release_date'),
                        "duration": music.get('duration_ms'),
                        "score": music.get('score', 100),
                        "spotify_id": music.get('external_metadata', {}).get('spotify', {}).get('track', {}).get('id'),
                        "isrc": music.get('external_ids', {}).get('isrc')
                    })
                return {
                    "success": True,
                    "tracks": tracks,
                    "match_count": len(tracks)
                }
            else:
                return {"success": False, "message": "Song not recognized", "code": result_dict['status']['code']}
                
    except Exception as e:
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
            # Extract ALL music matches from the result
            music_list = resultdict["metadata"]["music"]
            tracks = []
            for music in music_list:
                tracks.append({
                    "title": music.get('title'),
                    "artist": music['artists'][0]['name'] if music.get('artists') else None,
                    "album": music.get('album', {}).get('name'),
                    "release_date": music.get('release_date'),
                    "duration": music.get('duration_ms'),
                    "score": music.get('score', 100),
                    "spotify_id": music.get('external_metadata', {}).get('spotify', {}).get('track', {}).get('id'),
                    "isrc": music.get('external_ids', {}).get('isrc')
                })
            return {
                "success": True,
                "tracks": tracks,
                "match_count": len(tracks)
            }
        
        else:
            return {"success": False,
                    "message": "Song not recognized",
                    "code": resultdict['status']['code']
                    }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
