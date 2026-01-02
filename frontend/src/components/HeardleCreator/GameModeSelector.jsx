import { useState } from 'react';
import './GameModeSelector.css';

const GAME_MODES = {
  classic: {
    name: 'Classic Heardle',
    description: '6 attempts with increasing clip lengths',
    intervals: [1, 2, 4, 7, 11, 16],
    icon: '🎵'
  },
  extended: {
    name: 'Extended Play',
    description: '3 attempts with 10 seconds each',
    intervals: [10, 10, 10],
    icon: '⏱️'
  }
};

function GameModeSelector({ currentMode, onComplete, onBack }) {
  const [selectedMode, setSelectedMode] = useState(currentMode || 'classic');

  const handleContinue = () => {
    const mode = GAME_MODES[selectedMode];
    onComplete(selectedMode, mode.intervals);
  };

  return (
    <div className="game-mode-selector">
      <h2>🎮 Choose Game Mode</h2>
      <p>Select how your Heardle will be played</p>

      <div className="mode-options">
        {Object.entries(GAME_MODES).map(([key, mode]) => (
          <label 
            key={key}
            className={`mode-card ${selectedMode === key ? 'selected' : ''}`}
          >
            <input
              type="radio"
              name="gameMode"
              value={key}
              checked={selectedMode === key}
              onChange={(e) => setSelectedMode(e.target.value)}
            />
            <div className="mode-content">
              <div className="mode-icon">{mode.icon}</div>
              <h3>{mode.name}</h3>
              <p>{mode.description}</p>
              <div className="intervals">
                Clip lengths: {mode.intervals.join('s, ')}s
              </div>
            </div>
          </label>
        ))}
      </div>

      <div className="actions">
        <button onClick={onBack} className="back-btn">
          ← Back
        </button>
        <button onClick={handleContinue} className="continue-btn">
          Continue →
        </button>
      </div>
    </div>
  );
}

export default GameModeSelector;