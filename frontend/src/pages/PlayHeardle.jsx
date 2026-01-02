import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import './PlayHeardle.css';

function PlayHeardle() {
  const { id } = useParams();
  const playerRef = useRef(null);

  // Game state
  const [heardle, setHeardle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Play state
  const [currentAttempt, setCurrentAttempt] = useState(0);
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);

  // Load Heardle data
  useEffect(() => {
    loadHeardle();
  }, [id]);

  // Initialize YouTube player
  useEffect(() => {
    if (!heardle) return;

    const loadYouTubeAPI = () => {
      if (window.YT && window.YT.Player) {
        initializePlayer();
        return;
      }

      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = initializePlayer;
    };

    loadYouTubeAPI();

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [heardle]);

  const loadHeardle = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/heardles/${id}`);
      
      if (!response.ok) {
        throw new Error('Heardle not found');
      }

      const data = await response.json();
      setHeardle(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const initializePlayer = () => {
    playerRef.current = new window.YT.Player('heardle-player', {
      videoId: heardle.song.videoId,
      playerVars: {
        controls: 0,
        modestbranding: 1,
        rel: 0
      },
      events: {
        onReady: () => setPlayerReady(true)
      }
    });
  };

  const playClip = () => {
    if (!playerRef.current || !playerReady || gameOver) return;

    const clipLength = heardle.gameConfig.intervals[currentAttempt];
    const startTime = heardle.song.startTimeSeconds;

    // Seek to start
    playerRef.current.seekTo(startTime, true);
    playerRef.current.playVideo();

    // Stop after clip duration
    setTimeout(() => {
      playerRef.current.pauseVideo();
    }, clipLength * 1000);
  };

  const checkAnswer = (guess, acceptableAnswers) => {
    const normalized = guess.toLowerCase().trim();

    for (const answer of acceptableAnswers) {
      const normalizedAnswer = answer.toLowerCase().trim();

      // Exact match
      if (normalized === normalizedAnswer) return true;

      // Contains match (for partial answers)
      if (normalized.length >= 3 && normalizedAnswer.includes(normalized)) {
        return true;
      }

      // Simple Levenshtein distance for typos
      if (levenshteinDistance(normalized, normalizedAnswer) <= 2) {
        return true;
      }
    }

    return false;
  };

  const submitGuess = () => {
    if (!currentGuess.trim() || gameOver) return;

    const isCorrect = checkAnswer(currentGuess, heardle.challenge.acceptableAnswers);

    const newGuesses = [...guesses, { text: currentGuess, correct: isCorrect }];
    setGuesses(newGuesses);

    if (isCorrect) {
      setWon(true);
      setGameOver(true);
      // Play full clip as reward
      playerRef.current.seekTo(heardle.song.startTimeSeconds, true);
      playerRef.current.playVideo();
    } else if (currentAttempt >= heardle.gameConfig.intervals.length - 1) {
      setGameOver(true);
    } else {
      setCurrentAttempt(currentAttempt + 1);
    }

    setCurrentGuess('');
  };

  const skipTurn = () => {
    if (gameOver) return;

    setGuesses([...guesses, { text: '(skipped)', correct: false }]);

    if (currentAttempt >= heardle.gameConfig.intervals.length - 1) {
      setGameOver(true);
    } else {
      setCurrentAttempt(currentAttempt + 1);
    }
  };

  if (loading) {
    return <div className="play-heardle loading">Loading...</div>;
  }

  if (error) {
    return (
      <div className="play-heardle error">
        <h2>😕 Oops!</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="play-heardle">
      <div className="heardle-container">
        {/* Header */}
        <div className="heardle-header">
          <h1>🎵 Custom Heardle</h1>
          <p className="question">{heardle.challenge.question}</p>
        </div>

        {/* YouTube Player (hidden) */}
        <div style={{ display: 'none' }}>
          <div id="heardle-player"></div>
        </div>

        {/* Attempts Progress */}
        <div className="attempts-progress">
          {heardle.gameConfig.intervals.map((interval, i) => (
            <div
              key={i}
              className={`attempt-bar ${
                i < currentAttempt ? 'past' :
                i === currentAttempt ? 'current' :
                'future'
              } ${guesses[i]?.correct ? 'correct' : guesses[i] ? 'wrong' : ''}`}
            >
              {interval}s
            </div>
          ))}
        </div>

        {/* Play Button */}
        {!gameOver && (
          <button
            onClick={playClip}
            className="play-btn"
            disabled={!playerReady}
          >
            ▶️ Play {heardle.gameConfig.intervals[currentAttempt]}s Clip
          </button>
        )}

        {/* Guesses List */}
        {guesses.length > 0 && (
          <div className="guesses-list">
            {guesses.map((guess, i) => (
              <div key={i} className={`guess-item ${guess.correct ? 'correct' : 'wrong'}`}>
                <span className="attempt-number">#{i + 1}</span>
                <span className="guess-text">{guess.text}</span>
                <span className="guess-result">{guess.correct ? '✓' : '✗'}</span>
              </div>
            ))}
          </div>
        )}

        {/* Game Over */}
        {gameOver ? (
          <div className="game-over">
            {won ? (
              <>
                <h2>🎉 You got it!</h2>
                <p>Solved in {guesses.length} {guesses.length === 1 ? 'attempt' : 'attempts'}</p>
              </>
            ) : (
              <>
                <h2>😔 Nice try!</h2>
                <p>The answer was: <strong>{heardle.challenge.acceptableAnswers[0]}</strong></p>
              </>
            )}
            <div className="song-reveal">
              <img src={heardle.song.thumbnail} alt={heardle.song.title} />
              <div>
                <div className="song-title">{heardle.song.title}</div>
                <div className="song-artist">{heardle.song.artist}</div>
              </div>
            </div>
            <a href="/create-heardle" className="create-your-own">
              Create Your Own Heardle →
            </a>
          </div>
        ) : (
          <>
            {/* Input */}
            <div className="guess-input-container">
              <input
                type="text"
                placeholder="Type your answer..."
                value={currentGuess}
                onChange={(e) => setCurrentGuess(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitGuess()}
                className="guess-input"
                disabled={!playerReady}
              />
              <button onClick={submitGuess} className="submit-btn" disabled={!currentGuess.trim()}>
                Submit
              </button>
            </div>

            <button onClick={skipTurn} className="skip-btn">
              Skip (+{heardle.gameConfig.intervals[Math.min(currentAttempt + 1, heardle.gameConfig.intervals.length - 1)]}s)
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Simple Levenshtein distance for typo tolerance
function levenshteinDistance(a, b) {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export default PlayHeardle;