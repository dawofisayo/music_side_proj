import { useState } from 'react';
import './PreviewSummary.css';

function PreviewSummary({ heardleData, onBack, onCreate }) {
  const [isCreating, setIsCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [heardleUrl, setHeardleUrl] = useState('');
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setIsCreating(true);
    setError('');

    try {
      const result = await onCreate(heardleData);
      // Construct URL using current origin (works in dev and production)
      const url = result.url || `${window.location.origin}${result.path || `/heardle/${result.id}`}`;
      setHeardleUrl(url);
      setCreated(true);
    } catch (err) {
      setError(err.message || 'Failed to create Heardle');
      setIsCreating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(heardleUrl);
    // Optional: Show a toast notification
  };

  if (created) {
    return (
      <div className="preview-summary success">
        <div className="success-icon">🎉</div>
        <h2>Your Heardle is Ready!</h2>
        <p>Share this link with your friends:</p>

        <div className="share-box">
          <input
            type="text"
            value={heardleUrl}
            readOnly
            className="share-url"
          />
          <button onClick={copyToClipboard} className="copy-btn">
            📋 Copy
          </button>
        </div>

        <div className="next-steps">
          <a href={heardleUrl} target="_blank" rel="noopener noreferrer" className="test-btn">
            Test Your Heardle →
          </a>
          <a href="/create-heardle" className="create-another-btn">
            Create Another
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-summary">
      <h2>📝 Review Your Heardle</h2>
      <p>Make sure everything looks good before publishing</p>

      {/* Song Info */}
      <div className="review-section">
        <h3>🎵 Song</h3>
        <div className="song-card">
          <img src={heardleData.song.thumbnail} alt={heardleData.song.title} />
          <div className="song-details">
            <div className="song-title">{heardleData.song.title}</div>
            <div className="song-artist">{heardleData.song.artist}</div>
            <div className="song-meta">
              Starts at {Math.floor(heardleData.song.startTimeSeconds / 60)}:
              {(heardleData.song.startTimeSeconds % 60).toString().padStart(2, '0')}
            </div>
          </div>
        </div>
      </div>

      {/* Game Config */}
      <div className="review-section">
        <h3>🎮 Game Mode</h3>
        <div className="config-card">
          <div className="mode-name">
            {heardleData.gameConfig.mode === 'classic' ? 'Classic Heardle' : 'Extended Play'}
          </div>
          <div className="intervals">
            Clip lengths: {heardleData.gameConfig.intervals.join('s, ')}s
          </div>
        </div>
      </div>

      {/* Challenge */}
      <div className="review-section">
        <h3>❓ Challenge</h3>
        <div className="challenge-card">
          <div className="question">"{heardleData.challenge.question}"</div>
          <div className="answers-label">Accepts:</div>
          <ul className="answers-list">
            {heardleData.challenge.acceptableAnswers.map((answer, i) => (
              <li key={i}>"{answer}"</li>
            ))}
          </ul>
        </div>
      </div>

      {error && (
        <div className="error-message">
           {error}
        </div>
      )}

      <div className="actions">
        <button onClick={onBack} className="back-btn" disabled={isCreating}>
          ← Back
        </button>
        <button 
          onClick={handleCreate} 
          className="create-btn"
          disabled={isCreating}
        >
          {isCreating ? 'Creating...' : '🚀 Create Heardle'}
        </button>
      </div>
    </div>
  );
}

export default PreviewSummary;