import { useState } from 'react';
import { extractYouTubeId, fetchVideoMetadata } from '../../utils/youtubehelpers';
import './SongInput.css';

function SongInput({ data, onComplete }) {
  const [url, setUrl] = useState(data?.youtubeUrl || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [metadata, setMetadata] = useState(null);

  const handleLoadSong = async () => {
    setError('');
    setLoading(true);

    const videoId = extractYouTubeId(url);
    
    if (!videoId) {
      setError('Invalid YouTube URL. Please check the link and try again.');
      setLoading(false);
      return;
    }

    try {
      const data = await fetchVideoMetadata(videoId);
      setMetadata({ ...data, videoId });
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Could not load video. Make sure it exists and is public.');
      setLoading(false);
    }
  };

  const handleContinue = () => {
    onComplete({
      youtubeUrl: url,
      videoId: metadata.videoId,
      title: metadata.title,
      artist: metadata.channelTitle,
      thumbnail: metadata.thumbnail,
      startTimeSeconds: 0
    });
  };

  return (
    <div className="song-input">
      <h2>🎵 Add Your Song</h2>
      <p>Paste a YouTube URL to get started</p>
      
      <div className="input-group">
        <input
          type="text"
          placeholder="https://youtube.com/watch?v=..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !loading && handleLoadSong()}
          disabled={loading}
        />
        <button 
          onClick={handleLoadSong} 
          disabled={loading || !url.trim()}
        >
          {loading ? 'Loading...' : 'Load Song'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {metadata && (
        <div className="song-preview">
          <img src={metadata.thumbnail} alt={metadata.title} />
          <div className="song-info">
            <h3>{metadata.title}</h3>
            <p>{metadata.channelTitle}</p>
          </div>
          <button className="continue-btn" onClick={handleContinue}>
            Continue →
          </button>
        </div>
      )}
    </div>
  );
}

export default SongInput;