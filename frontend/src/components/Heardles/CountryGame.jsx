import { useState, useRef, useEffect } from 'react';
import { SONG_DATABASE } from '../../data/songs';
import './CountryGame.css';

function CountryGame() {
  const [dailySong, setDailySong] = useState(null);
  const [userGuess, setUserGuess] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  const playerRef = useRef(null);
  const maxPlays = 3;

  // Comprehensive list of countries
  const allCountries = [
    'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Australia', 'Austria',
    'Bangladesh', 'Belgium', 'Brazil', 'Bulgaria', 'Canada', 'Chile', 'China',
    'Colombia', 'Croatia', 'Cuba', 'Czech Republic', 'Denmark', 'Dominican Republic',
    'Egypt', 'Estonia', 'Ethiopia', 'Finland', 'France', 'Germany', 'Ghana', 'Greece',
    'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Ireland', 'Israel', 'Italy',
    'Jamaica', 'Japan', 'Kenya', 'South Korea', 'Latvia', 'Lebanon', 'Lithuania',
    'Malaysia', 'Mexico', 'Morocco', 'Netherlands', 'New Zealand', 'Nigeria', 'Norway',
    'Pakistan', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Romania', 'Russia',
    'Saudi Arabia', 'Serbia', 'Singapore', 'South Africa', 'Spain', 'Sweden',
    'Switzerland', 'Taiwan', 'Thailand', 'Turkey', 'Ukraine', 'United Arab Emirates',
    'UK', 'USA', 'Venezuela', 'Vietnam'
  ];

  // Get random song
  useEffect(() => {
    const randomSong = SONG_DATABASE[Math.floor(Math.random() * SONG_DATABASE.length)];
    setDailySong(randomSong);
  }, []);

  // YouTube player setup
  useEffect(() => {
    if (!dailySong) return;

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      playerRef.current = new window.YT.Player('country-player', {
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
  TODO: Implement playSnippet
  Hint: Copy from DecadeGame - exact same logic!
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
  const handleSearch = (value) => {
    setSearchQuery(value);
    
    if (value.length < 1) {
      setSearchResults([]);
      return;
    }
    
    // Filter countries based on search query
    const filtered = allCountries.filter(country =>
      country.toLowerCase().includes(value.toLowerCase())
    ).slice(0, 10); // Show top 10 results
    
    setSearchResults(filtered);
  };

  const handleCountryGuess = (country) => {
    setUserGuess(country);
    setShowResult(true);
    setSearchQuery('');
    setSearchResults([]);
    if (playerRef.current && isPlaying) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
    }
  };
  
  const isCorrect = () => {
    return userGuess === dailySong.country;
  };

  if (!dailySong) {
    return <div className="country-game-container">Loading...</div>;
  }

  return (
    <div className="country-game-container">
      <h1>🌍 Guess the Country</h1>
      <p className="subtitle">Listen to the song and guess where the artist is from</p>

      <div id="country-player" style={{ display: 'none' }}></div>

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

      {!showResult && (
        <div className="country-search-container">
          <input
            type="text"
            placeholder="Search for a country..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="country-search-input"
            disabled={playCount === 0}
          />
          
          {searchResults.length > 0 && (
            <div className="country-search-results">
              {searchResults.map((country, idx) => (
                <div
                  key={idx}
                  className="country-result-item"
                  onClick={() => handleCountryGuess(country)}
                >
                  {country}
                </div>
              ))}
            </div>
          )}
          
          {searchQuery.length > 0 && searchResults.length === 0 && (
            <div className="country-no-results">
              No countries found matching "{searchQuery}"
            </div>
          )}
        </div>
      )}

      {showResult && (
        <div className={`result ${isCorrect() ? 'correct' : 'wrong'}`}>
          {isCorrect() ? (
            <div>
              <h2>🎉 Correct!</h2>
              <p>You guessed the right country!</p>
            </div>
          ) : (
            <div>
              <h2>❌ Not quite!</h2>
              <p>The correct answer was: <strong>{dailySong.country}</strong></p>
            </div>
          )}
          
          <div className="song-reveal">
            <p><strong>{dailySong.title}</strong></p>
            <p>by {dailySong.artist}</p>
            <p>Country: {dailySong.country}</p>
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

export default CountryGame;