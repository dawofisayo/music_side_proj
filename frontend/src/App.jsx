import { useState } from 'react';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResult(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('audio', file);

    try {
      const response = await fetch('http://localhost:3000/api/identify', {
        method: 'POST',
        body: formData,
      });

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
      <h1>🎵 Music Identifier</h1>
      
      <form onSubmit={handleSubmit}>
        <input 
          type="file" 
          accept="audio/*"
          onChange={handleFileChange}
        />
        <button type="submit" disabled={!file || loading}>
          {loading ? 'Identifying...' : 'Identify Song'}
        </button>
      </form>

      {error && (
        <div style={{ color: 'red', marginTop: '20px' }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '20px', textAlign: 'left' }}>
          {result.success && result.track ? (
            <div className="track-card">
              <h2>✅ Found it!</h2>
              <p><strong>Title:</strong> {result.track.title}</p>
              <p><strong>Artist:</strong> {result.track.artist}</p>
              {result.track.album && <p><strong>Album:</strong> {result.track.album}</p>}
              {result.track.release_date && <p><strong>Release Date:</strong> {result.track.release_date}</p>}
              {result.track.spotify_id && (
                <p><strong>Spotify:</strong> <a href={`https://open.spotify.com/track/${result.track.spotify_id}`} target="_blank" rel="noopener noreferrer">Open in Spotify</a></p>
              )}
            </div>
          ) : result.success === false ? (
            <div>
              <h2>❌ Not found</h2>
              <p>Could not identify this song</p>
            </div>
          ) : (
            <div style={{ color: 'orange' }}>
              <h2>⚠️ Unexpected response</h2>
              <pre style={{ fontSize: '12px' }}>{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;