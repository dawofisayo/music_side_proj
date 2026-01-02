import { useRef, useEffect, useState } from 'react';
import { formatTime } from '../../utils/youtubehelpers';
import './StartTimePicker.css';

function StartTimePicker({ videoId, currentStartTime, onComplete, onBack }) {
  const playerRef = useRef(null);
  const [startTime, setStartTime] = useState(currentStartTime);
  const [duration, setDuration] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Load YouTube IFrame API
  useEffect(() => {
    // Check if API is already loaded
    if (window.YT && window.YT.Player) {
      initializePlayer();
      return;
    }

    // Load the API
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    // API calls this when ready
    window.onYouTubeIframeAPIReady = initializePlayer;

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [videoId]);

  const initializePlayer = () => {
    playerRef.current = new window.YT.Player('youtube-player', {
      videoId: videoId,
      playerVars: {
        controls: 1,
        modestbranding: 1,
        rel: 0
      },
      events: {
        onReady: handlePlayerReady,
        onStateChange: handleStateChange
      }
    });
  };

  const handlePlayerReady = (event) => {
    setDuration(Math.floor(event.target.getDuration()));
    setPlayerReady(true);
  };

  const handleStateChange = (event) => {
    setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
  };

  const handleSeek = (newTime) => {
    setStartTime(newTime);
    if (playerRef.current && playerReady) {
      playerRef.current.seekTo(newTime, true);
      if (!isPlaying) {
        playerRef.current.pauseVideo();
      }
    }
  };

  const handlePreviewClip = (clipLength = 1) => {
    if (!playerRef.current || !playerReady) return;

    // Seek to start time
    playerRef.current.seekTo(startTime, true);
    playerRef.current.playVideo();

    // Stop after clipLength seconds
    setTimeout(() => {
      playerRef.current.pauseVideo();
    }, clipLength * 1000);
  };

  const handleContinue = () => {
    onComplete(startTime);
  };

  return (
    <div className="start-time-picker">
      <h2>⏱️ Choose Start Point</h2>
      <p>Pick where in the song your Heardle clips should start</p>

      {/* YouTube Player */}
      <div className="player-container">
        <div id="youtube-player"></div>
      </div>

      {playerReady && (
        <>
          {/* Time Slider */}
          <div className="time-controls">
            <span className="time-label">Start at: {formatTime(startTime)}</span>
            <input
              type="range"
              min="0"
              max={duration}
              value={startTime}
              onChange={(e) => handleSeek(parseInt(e.target.value))}
              className="time-slider"
            />
            <span className="time-label">Duration: {formatTime(duration)}</span>
          </div>

          {/* Preview Buttons */}
          <div className="preview-controls">
            <button onClick={() => handlePreviewClip(1)} className="preview-btn">
              Preview 1s Clip
            </button>
            <button onClick={() => handlePreviewClip(2)} className="preview-btn">
              Preview 2s Clip
            </button>
            <button onClick={() => handlePreviewClip(5)} className="preview-btn">
              Preview 5s Clip
            </button>
          </div>
        </>
      )}

      {/* Navigation */}
      <div className="actions">
        <button onClick={onBack} className="back-btn">
          ← Back
        </button>
        <button 
          onClick={handleContinue} 
          className="continue-btn"
          disabled={!playerReady}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

export default StartTimePicker;