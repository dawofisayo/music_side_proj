from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from acrcloud.recognizer import ACRCloudRecognizer
import json

load_dotenv()
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
            # Extract music info from the result
            music = resultdict["metadata"]["music"][0]
            return {"success": True,                 
                    "track": {
                        "title": music.get('title'),
                        "artist": music['artists'][0]['name'] if music.get('artists') else None,
                        "album": music.get('album', {}).get('name'),
                        "release_date": music.get('release_date'),
                        "duration": music.get('duration_ms'),
                        "spotify_id": music.get('external_metadata', {}).get('spotify', {}).get('track', {}).get('id'),
                        "isrc": music.get('external_ids', {}).get('isrc')
                    }
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
