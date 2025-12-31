import { useState, useRef } from 'react';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inputMode, setInputMode] = useState('file');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  
  // Microphone recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResult(null);
    setError(null);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordedBlob(null);
      setRecordingTime(0);
      setResult(null);
      setError(null);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      setError('Could not access microphone. Please allow microphone access.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (inputMode === 'file' && !file) {
      setError('Please select a file');
      return;
    }
    
    if (inputMode === 'url' && !youtubeUrl.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    if (inputMode === 'mic' && !recordedBlob) {
      setError('Please record some audio first');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let response;
      if (inputMode === 'file') {
        const formData = new FormData();
        formData.append('audio', file);
        response = await fetch('http://localhost:3000/api/identify', {
          method: 'POST',
          body: formData,
        });
      } else if (inputMode === 'mic') {
        const formData = new FormData();
        formData.append('audio', recordedBlob, 'recording.webm');
        response = await fetch('http://localhost:3000/api/identify', {
          method: 'POST',
          body: formData,
        });
      } else {
        response = await fetch('http://localhost:3000/api/identify/youtube', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: youtubeUrl }),
        });
      }
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('Failed to identify song: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <div className="container">
        <h1>🎵 Music Identifier</h1>
        <p className="subtitle">Record, upload, or paste a YouTube URL to identify any song</p>
        
        <div className="mode-toggle">
          <button 
            className={`mode-btn ${inputMode === 'mic' ? 'active' : ''}`}
            onClick={() => { setInputMode('mic'); setRecordedBlob(null); setRecordingTime(0); }}
            type="button"
          >
            🎙️ Record
          </button>
          <button 
            className={`mode-btn ${inputMode === 'file' ? 'active' : ''}`}
            onClick={() => setInputMode('file')}
            type="button"
          >
            📁 Upload
          </button>
          <button 
            className={`mode-btn ${inputMode === 'url' ? 'active' : ''}`}
            onClick={() => setInputMode('url')}
            type="button"
          >
            🔗 YouTube
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {inputMode === 'mic' ? (
            <div className="mic-section">
              <div className={`mic-visualizer ${isRecording ? 'recording' : ''}`}>
                <div className="mic-icon">🎙️</div>
                {isRecording && (
                  <div className="recording-waves">
                    <span></span><span></span><span></span><span></span><span></span>
                  </div>
                )}
              </div>
              
              <div className="recording-time">{formatTime(recordingTime)}</div>
              
              {!isRecording ? (
                <button 
                  type="button" 
                  className="record-btn start"
                  onClick={startRecording}
                >
                  ⏺️ Start Recording
                </button>
              ) : (
                <button 
                  type="button" 
                  className="record-btn stop"
                  onClick={stopRecording}
                >
                  ⏹️ Stop Recording
                </button>
              )}
              
              {recordedBlob && !isRecording && (
                <p className="file-selected">✅ Recording ready ({formatTime(recordingTime)})</p>
              )}
            </div>
          ) : inputMode === 'file' ? (
            <div className="file-input-wrapper">
              <label htmlFor="audio-file" className="file-label">
                {file ? `📄 ${file.name}` : '📁 Choose an audio file...'}
              </label>
              <input 
                type="file" 
                id="audio-file"
                accept="audio/*"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <input 
              type="text"
              className="url-input"
              placeholder="https://youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
            />
          )}

          <button 
            type="submit" 
            className={`submit-btn ${loading ? 'loading' : ''}`}
            disabled={
              (inputMode === 'file' && !file) || 
              (inputMode === 'url' && !youtubeUrl.trim()) || 
              (inputMode === 'mic' && !recordedBlob) ||
              isRecording ||
              loading
            }
          >
            {loading ? '🔍 Identifying...' : '🎤 Identify Song'}
          </button>
        </form>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {result && (
          <div className="result-section">
            {result.success && result.tracks?.length > 0 ? (
              <>
                <h2 className="results-header">
                  ✅ Found {result.match_count} match{result.match_count > 1 ? 'es' : ''}!
                </h2>
                {result.tracks.map((track, index) => (
                  <div key={index} className="track-card">
                    <div className="track-header">
                      <span className="match-badge">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'} Match #{index + 1}
                      </span>
                      {track.score && <span className="score">{track.score}% match</span>}
                    </div>
                    <h2 className="track-title">{track.title}</h2>
                    <p className="track-artist">{track.artist}</p>
                    
                    <div className="track-details">
                      {track.album && (
                        <div className="detail-row">
                          <span className="detail-label">Album</span>
                          <span className="detail-value">{track.album}</span>
                        </div>
                      )}
                      {track.release_date && (
                        <div className="detail-row">
                          <span className="detail-label">Released</span>
                          <span className="detail-value">{track.release_date}</span>
                        </div>
                      )}
                    </div>
                    
                    {track.spotify_id && (
                      <a 
                        href={`https://open.spotify.com/track/${track.spotify_id}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="spotify-btn"
                      >
                        🎧 Open in Spotify
                      </a>
                    )}
                  </div>
                ))}
              </>
            ) : result.success === false ? (
              <div className="not-found">
                <h2>❌ Song Not Found</h2>
                <p>We couldn't identify this song. Try a different section or file.</p>
              </div>
            ) : (
              <div className="error-card">
                <h2>⚠️ Unexpected Response</h2>
                <pre>{JSON.stringify(result, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
