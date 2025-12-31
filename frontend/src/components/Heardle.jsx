import { useState, useRef, useEffect } from 'react';
import { getDailySong, SONG_DATABASE } from '../data/songs';
import './Heardle.css';

function Heardle() {
  const [dailySong] = useState(getDailySong());
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [playCount, setPlayCount] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioRef = useRef(null);
  const playerRef = useRef(null);

  // Audio snippet durations (in seconds)
  const snippetDurations = [1, 2, 4, 7, 11, 16];
  const maxGuesses = 6;

  useEffect(() => {
    const initYouTubePlayer = () => {
      if (window.YT && window.YT.Player) {
        if (playerRef.current) {
          playerRef.current.destroy();
        }
        playerRef.current = new window.YT.Player('youtube-player', {
          height: '0',
          width: '0',
          videoId: dailySong.youtubeId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
          },
        });
      }
    };

    // Load YouTube IFrame API if not already loaded
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      
      window.onYouTubeIframeAPIReady = () => {
        initYouTubePlayer();
      };
    } else if (window.YT.Player) {
      // API already loaded
      initYouTubePlayer();
    } else {
      // API script loading but not ready yet
      window.onYouTubeIframeAPIReady = () => {
        initYouTubePlayer();
      };
    }

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // Ignore destroy errors
        }
        playerRef.current = null;
      }
    };
  }, [dailySong]);

  const playSnippet = () => {
    if (gameOver || playCount >= maxGuesses || !playerRef.current) return;
    
    try {
      const duration = snippetDurations[playCount];
      setIsPlaying(true);
      
      // Play from start
      playerRef.current.seekTo(0, true);
      playerRef.current.playVideo();
      
      setTimeout(() => {
        if (playerRef.current) {
          playerRef.current.pauseVideo();
        }
        setIsPlaying(false);
      }, duration * 1000);
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    }
  };

  const handleSearch = (value) => {
    setCurrentGuess(value);
    
    if (value.length < 2) {
      setSearchResults([]);
      return;
    }
    
    // Simple search through song database
    const results = SONG_DATABASE.filter(song => 
      song.title.toLowerCase().includes(value.toLowerCase()) ||
      song.artist.toLowerCase().includes(value.toLowerCase())
    ).slice(0, 5);
    
    setSearchResults(results);
  };

  const submitGuess = (song) => {
    if (gameOver) return;
    
    const newGuesses = [...guesses, song];
    setGuesses(newGuesses);
    setCurrentGuess('');
    setSearchResults([]);
    
    // Check if correct
    if (song.id === dailySong.id) {
      setGameWon(true);
      setGameOver(true);
      // Play full song
      if (playerRef.current) {
        playerRef.current.seekTo(0, true);
        playerRef.current.playVideo();
      }
    } else if (newGuesses.length >= maxGuesses) {
      setGameOver(true);
    } else {
      setPlayCount(playCount + 1);
    }
  };

  const skipGuess = () => {
    if (gameOver || playCount >= maxGuesses - 1) return;
    
    setGuesses([...guesses, null]); // null = skipped
    setPlayCount(playCount + 1);
  };

  const shareResults = () => {
    const emojiGrid = guesses.map((guess, idx) => {
      if (guess === null) return '⬜'; // Skipped
      if (guess.id === dailySong.id) return '🟩'; // Correct
      return '🟥'; // Wrong
    }).join('');
    
    const text = `🎵 Heardle ${new Date().toLocaleDateString()}\n${emojiGrid}\n\nGuessed in ${guesses.length}/${maxGuesses}`;
    
    navigator.clipboard.writeText(text);
    alert('Results copied to clipboard!');
  };

  return (
    <div className="heardle-container">
      <h1>🎵 Daily Heardle</h1>
      <p className="subtitle">Guess the song in 6 tries</p>
      
      {/* Hidden YouTube player */}
      <div id="youtube-player" style={{ display: 'none' }}></div>
      
      {/* Progress indicators */}
      <div className="progress-bar">
        {Array.from({ length: maxGuesses }).map((_, idx) => (
          <div 
            key={idx} 
            className={`progress-segment ${
              idx < guesses.length ? 'filled' : ''
            } ${idx === playCount && !gameOver ? 'active' : ''}`}
          />
        ))}
      </div>

      {/* Audio controls */}
      {!gameOver && (
        <div className="audio-controls">
          <button 
            className="play-button"
            onClick={playSnippet}
            disabled={isPlaying || playCount >= maxGuesses}
          >
            {isPlaying ? '⏸️ Playing...' : `▶️ Play ${snippetDurations[playCount]}s`}
          </button>
          
          {guesses.length < maxGuesses && (
            <button 
              className="skip-button"
              onClick={skipGuess}
              disabled={playCount >= maxGuesses - 1}
            >
              Skip (+1s)
            </button>
          )}
        </div>
      )}

      {/* Guesses list */}
      <div className="guesses-list">
        {guesses.map((guess, idx) => (
          <div key={idx} className={`guess-item ${
            guess === null ? 'skipped' : 
            guess.id === dailySong.id ? 'correct' : 'wrong'
          }`}>
            {guess === null ? (
              <span className="skipped-text">Skipped</span>
            ) : (
              <span>
                {guess.title} - {guess.artist}
                {guess.id === dailySong.id ? ' ✓' : ' ✗'}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Search input */}
      {!gameOver && guesses.length < maxGuesses && (
        <div className="search-container">
          <input
            type="text"
            placeholder="Search for a song..."
            value={currentGuess}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
          
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map(song => (
                <div 
                  key={song.id}
                  className="search-result-item"
                  onClick={() => submitGuess(song)}
                >
                  <strong>{song.title}</strong>
                  <span className="artist-name">{song.artist}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Game over screen */}
      {gameOver && (
        <div className="game-over">
          {gameWon ? (
            <div className="win-message">
              <h2>🎉 You got it!</h2>
              <p className="answer">
                <strong>{dailySong.title}</strong> by {dailySong.artist}
              </p>
              <p>Guessed in {guesses.length}/{maxGuesses}</p>
            </div>
          ) : (
            <div className="lose-message">
              <h2>😔 Better luck tomorrow!</h2>
              <p className="answer">
                The song was: <strong>{dailySong.title}</strong> by {dailySong.artist}
              </p>
            </div>
          )}
          
          <button className="share-button" onClick={shareResults}>
            📋 Share Results
          </button>
        </div>
      )}
    </div>
  );
}

export default Heardle;