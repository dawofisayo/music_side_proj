import { useState, useRef, useEffect } from 'react';
import { SONG_DATABASE } from '../../data/songs';
import './DecadeGame.css';

function DecadeGame() {
  // I'll set up state
  const [dailySong, setDailySong] = useState(null);
  const [userGuess, setUserGuess] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  
  const playerRef = useRef(null);
  const maxPlays = 3; // Can listen 3 times before must guess

  // Get a random song on mount
  useEffect(() => {
    const randomSong = SONG_DATABASE[Math.floor(Math.random() * SONG_DATABASE.length)];
    setDailySong(randomSong);
  }, []);

  // YouTube player setup; same as heardle
  useEffect(() => {
    if (!dailySong) return;

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      playerRef.current = new window.YT.Player('decade-player', {
        height: '0',
        width: '0',
        videoId: dailySong.youtubeId,
        playerVars: {
          controls: 0,
          disablekb: 1,
        },
        events: {
          onReady: () => setPlayerReady(true),
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
            } else {
              setIsPlaying(false);
            }
          }
        }
      });
    };

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [dailySong]);

  /*
  TODO: Implement playSnippet function
  
  Hint: Similar to Heardle
  - Play 10 seconds of the song
  - Increment playCount
  - Use setTimeout to pause after 10 seconds
  */
  const playSnippet = () => {
    if (playCount >= maxPlays || !playerRef.current) return;
    
    try {
      setIsPlaying(true);
      playerRef.current.seekTo(30, true)
      playerRef.current.playVideo();
      
      setTimeout(() => {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
      }, 10000);
      setPlayCount(playCount + 1);
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    }
    
  };

  /*
  TODO: Implement handleDecadeGuess function
  
  Parameters: decade (string like "1980s", "1990s", etc.)
  
  Logic needed:
  1. Set userGuess to the decade they clicked
  2. Set showResult to true
  3. Stop the music if playing
  
  */
  const handleDecadeGuess = (decade) => {
    setUserGuess(decade);
    setShowResult(true);
    if (playerRef.current && isPlaying) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
    }
  };

  /*
  TODO: Implement getCorrectDecade function
  
  Takes: year (number like 2019)
  Returns: decade string (like "2010s")
  
  Hint: 
  - 1960-1969 → "1960s"
  - 1970-1979 → "1970s"
  - etc.
  
  Use Math.floor() to help!
  */
  const getCorrectDecade = (year) => {
    return Math.floor(year / 10) * 10 + 's';
  };

  /*
  TODO: Implement isCorrect function
  
  Returns: boolean - did they guess correctly?
  
  Compare userGuess with the correct decade
  */
  const isCorrect = () => {
    return userGuess === getCorrectDecade(dailySong.releaseYear);
  };

  if (!dailySong) {
    return <div className="decade-game-container">Loading...</div>;
  }

  // Available decades
  const decades = ['1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'];

  return (
    <div className="decade-game-container">
      <h1>🎵 Guess the Decade</h1>
      <p className="subtitle">Listen to the song and guess which decade it's from</p>

      {/* Hidden YouTube player */}
      <div id="decade-player" style={{ display: 'none' }}></div>

      {/* Play button */}
      {!showResult && (
        <div className="play-section">
          <button
            className="play-button"
            onClick={playSnippet}
            disabled={!playerReady || isPlaying || playCount >= maxPlays}
          >
            {!playerReady ? '⏳ Loading...' : 
             isPlaying ? '⏸️ Playing...' : 
             playCount >= maxPlays ? '🎵 Make your guess!' :
             `▶️ Play (${playCount}/${maxPlays})`}
          </button>
        </div>
      )}

      {/* Decade buttons */}
      {!showResult && (
        <div className="decades-grid">
          {/*
            TODO: Map over 'decades' array and create buttons
            
            For each decade:
            - Create a button
            - onClick should call handleDecadeGuess(decade)
            - Display the decade text (e.g., "1980s")
            - Disable if playCount is 0 (must listen first)
            
            Example structure:
            <button 
              onClick={() => handleDecadeGuess(decade)}
              disabled={playCount === 0}
            >
              {decade}
            </button>
          */}
          {decades.map((decade) => (
            <button
              onClick={() => handleDecadeGuess(decade)}
              disabled={playCount === 0}
            >
              {decade}
            </button>
          ))}
        </div>
      )}

      {/* Result */}
      {showResult && (
        <div className={`result ${isCorrect() ? 'correct' : 'wrong'}`}>
          {isCorrect() ? (
            <div>
              <h2>🎉 Correct!</h2>
              <p>You guessed the right decade!</p>
            </div>
          ) : (
            <div>
              <h2>❌ Not quite!</h2>
              <p>The correct decade was: <strong>{getCorrectDecade(dailySong.releaseYear)}</strong></p>
            </div>
          )}
          
          <div className="song-reveal">
            <p><strong>{dailySong.title}</strong></p>
            <p>by {dailySong.artist}</p>
            <p>Released: {dailySong.releaseYear}</p>
            <a 
              href={`https://www.youtube.com/watch?v=${dailySong.youtubeId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="youtube-link"
            >
              🎬 Watch on YouTube
            </a>
          </div>

          <button 
            className="play-again-button"
            onClick={() => window.location.reload()}
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}

export default DecadeGame;