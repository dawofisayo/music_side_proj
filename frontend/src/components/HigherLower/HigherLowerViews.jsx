import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import { SONG_DATABASE } from '../../data/songs';
import './HigherLower.css';

function HigherLower() {
  const [songA, setSongA] = useState(null);
  const [songB, setSongB] = useState(null);
  const [viewsA, setViewsA] = useState(null);
  const [viewsB, setViewsB] = useState(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initialize game
  useEffect(() => {
    startNewGame();
  }, []);

  const startNewGame = async () => {
    const song1 = getRandomSong()
    const song2 = getRandomSong(song1)
    setSongA(song1)
    setSongB(song2)
    setViewsA(await fetchViews(song1))
    setViewsB(await fetchViews(song2))
    setScore(0)
    setGameOver(false)
    setShowResult(false)
    setLoading(false)
  };

  const nextRound = async () => {
    const newSongA = songB;  
    const newSongB = getRandomSong(newSongA); 
    
    setSongA(newSongA);
    setSongB(newSongB);
    setViewsA(viewsB);
    setViewsB(await fetchViews(newSongB)); 
    setShowResult(false);
  };

  // Helper: Get random song
  const getRandomSong = (excludeSong = null) => {
    let randomSong;
    do {
      randomSong = SONG_DATABASE[Math.floor(Math.random() * SONG_DATABASE.length)];
    } while (excludeSong && randomSong.id === excludeSong.id);
    return randomSong;
  };

  // Fetch YouTube views
  const fetchViews = async (song) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/youtube/views/${song.youtubeId}`);
      const data = await response.json();
      return data.views;
    } catch (error) {
      console.error('Failed to fetch views:', error);
      return 0;
    }
  };

  /*
  TODO: Implement handleGuess
  
  Parameters: guess (string - either "higher" or "lower")
  
  Logic:
  1. Determine if guess is correct:
     - If guess is "higher": viewsB > viewsA
     - If guess is "lower": viewsB < viewsA
  
  2. Set showResult to true
  
  3. If correct:
     - Increment score
     - After 2 seconds, call nextRound()
  
  4. If wrong:
     - Set gameOver to true
  
  Hint: Use setTimeout for the 2-second delay before nextRound
  */
  const handleGuess = (guess) => {
    const isCorrect = 
    (guess === 'higher' && viewsB > viewsA) || 
    (guess === 'lower' && viewsB < viewsA);
  
    setShowResult(true);  
  
    if (isCorrect) {
        setScore(score + 1);
        setTimeout(nextRound, 2000);  
    } else {
        setGameOver(true);
        setTimeout(startNewGame, 2000);
    }
  };

  // Format view count (e.g., 1234567 → "1.2M")
  const formatViews = (views) => {
    if (views >= 1000000000) return (views / 1000000000).toFixed(1) + 'B';
    if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
    if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
    return views;
  };

  if (loading || !songA || !songB || viewsA === null) {
    return <div className="higher-lower-container">Loading...</div>;
  }

  return (
    <div className="higher-lower-container">
      <div className="game-header">
        <h1>📊 Higher or Lower</h1>
        <p className="score">Score: {score}</p>
      </div>

      <div className="comparison-container">
        {/* Song A - Always show views */}
        <div className="song-card song-a">
          <div className="song-info">
            <h2>{songA.title}</h2>
            <p className="artist">{songA.artist}</p>
          </div>
          <div className="views-display">
            <p className="views-number">{formatViews(viewsA)}</p>
            <p className="views-label">YouTube views</p>
          </div>
        </div>

        <div className="vs-divider">VS</div>

        {/* Song B - Hide views until guess */}
        <div className="song-card song-b">
          <div className="song-info">
            <h2>{songB.title}</h2>
            <p className="artist">{songB.artist}</p>
          </div>
          
          {showResult ? (
            <div className="views-display">
              <p className="views-number">{formatViews(viewsB)}</p>
              <p className="views-label">YouTube views</p>
            </div>
          ) : (
            <div className="guess-buttons">
              <button 
                className="guess-button higher"
                onClick={() => handleGuess('higher')}
                disabled={gameOver}
              >
                ⬆️ Higher
              </button>
              <button 
                className="guess-button lower"
                onClick={() => handleGuess('lower')}
                disabled={gameOver}
              >
                ⬇️ Lower
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Result message */}
      {showResult && !gameOver && (
        <div className="result-message correct">
          ✅ Correct! Next round coming...
        </div>
      )}

      {/* Game Over */}
      {gameOver && (
        <div className="game-over">
          <h2>Game Over!</h2>
          <p className="final-score">Final Score: {score}</p>
          <button className="play-again" onClick={startNewGame}>
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}

export default HigherLower;