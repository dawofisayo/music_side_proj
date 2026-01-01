import { useState, useEffect } from 'react';
import './Connections.css';

function Connections() {
  const [puzzle, setPuzzle] = useState(null);
  const [shuffledItems, setShuffledItems] = useState([]);
  const [selected, setSelected] = useState([]);
  const [solvedGroups, setSolvedGroups] = useState([]);
  const [lives, setLives] = useState(4);
  const [gameOver, setGameOver] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shakeWrong, setShakeWrong] = useState(false);

  // Load puzzle on mount
  useEffect(() => {
    loadPuzzle();
  }, []);

  /*
  TODO: Implement loadPuzzle
  
  Steps:
  1. Fetch from 'http://localhost:3000/api/connections/daily'
  2. Set puzzle state with response
  3. Extract all 16 items from all 4 groups
  4. Shuffle those 16 items (use shuffleArray helper below)
  5. Set shuffledItems
  6. Set loading to false
  
  Hint: 
  const allItems = puzzle.groups.flatMap(group => group.items);
  const shuffled = shuffleArray(allItems);
  */
  const loadPuzzle = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/connections/daily');
      const data = await response.json();

      // Check if the response has an error or is missing groups
      if (!response.ok || data.error || !data.groups) {
        throw new Error(data.error || 'Failed to load puzzle');
      }

      setPuzzle(data);

      const allItems = data.groups.flatMap(group => group.items);
      const shuffled = shuffleArray(allItems);
      setShuffledItems(shuffled);
      setLoading(false);
    } catch (error) {
      console.error('Error loading puzzle:', error);
      setLoading(false);
      // You might want to set an error state here to show to the user
    }
  };

  const toggleSelect = (item) => {
    if (selected.includes(item)) {
      setSelected(selected.filter(i => i !== item));
    } else {
      if (selected.length < 4) {
        setSelected([...selected, item]);
      }
    }
  };

  const submitGuess = () => {
    if (selected.length !== 4) {
        return;
    }
    const sortedSelected = [...selected].sort();
    let matchedGroup = null;
    for (const group of puzzle.groups) {
        const sortedGroup = [...group.items].sort();
        if (JSON.stringify(sortedSelected) === JSON.stringify(sortedGroup)) {
            matchedGroup = group;
            break;
        }
    }
    if (matchedGroup) {
        setSolvedGroups([...solvedGroups, matchedGroup]);
            setSelected([]);
            if (solvedGroups.length + 1 === 4) {
                setGameOver(true);
            }
    }
    else {
        setShakeWrong(true);
        setTimeout(() => setShakeWrong(false), 500);
        setSelected([]);
        setLives(lives - 1);
        if (lives - 1 === 0) {
            setGameOver(true);
        }
    }
  };


  const deselectAll = () => {
    setSelected([]);
  };


  const shuffleRemaining = () => {
    const remaining = shuffledItems.filter(item => 
      !solvedGroups.some(group => group.items.includes(item))
    );
    const shuffled = shuffleArray(remaining);
    setShuffledItems(shuffled);
  };

  // Helper: Shuffle array 
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Get remaining items (not solved yet)
  const getRemainingItems = () => {
    return shuffledItems.filter(item => 
      !solvedGroups.some(group => group.items.includes(item))
    );
  };

  if (loading) {
    return (
      <div className="connections-container">
        <div className="loading">Loading puzzle...</div>
      </div>
    );
  }

  const remainingItems = getRemainingItems();
  const hasWon = solvedGroups.length === 4;

  return (
    <div className="connections-container">
      <h1>🎵 Music Connections</h1>
      <p className="subtitle">Find groups of four that share something in common</p>

      {/* Lives indicator */}
      <div className="lives">
        Mistakes remaining: {' '}
        {Array.from({ length: lives }).map((_, i) => (
          <span key={i} className="life">●</span>
        ))}
      </div>

      {/* Solved groups at top */}
      {solvedGroups.map((group, idx) => (
        <div key={idx} className={`solved-group difficulty-${group.difficulty}`}>
          <div className="category-name">{group.category}</div>
          <div className="group-items">
            {group.items.join(', ')}
          </div>
        </div>
      ))}

      {/* Game grid */}
      {!hasWon && !gameOver && (
        <div className={`items-grid ${shakeWrong ? 'shake' : ''}`}>
          {remainingItems.map(item => (
            <button
              key={item}
              className={`item ${selected.includes(item) ? 'selected' : ''}`}
              onClick={() => toggleSelect(item)}
            >
              {item}
            </button>
          ))}
        </div>
      )}

      {/* Action buttons */}
      {!hasWon && !gameOver && (
        <div className="actions">
          <button onClick={shuffleRemaining} className="action-btn">
            🔀 Shuffle
          </button>
          <button onClick={deselectAll} className="action-btn" disabled={selected.length === 0}>
            Deselect All
          </button>
          <button 
            onClick={submitGuess} 
            className="submit-btn"
            disabled={selected.length !== 4}
          >
            Submit
          </button>
        </div>
      )}

      {/* Win/Lose screen */}
      {hasWon && (
        <div className="result-screen win">
          <h2>🎉 Perfect!</h2>
          <p>You found all 4 groups!</p>
          <button onClick={() => window.location.reload()}>Play Again</button>
        </div>
      )}

      {gameOver && !hasWon && (
        <div className="result-screen lose">
          <h2>Game Over!</h2>
          <p>You found {solvedGroups.length}/4 groups</p>
          <button onClick={() => window.location.reload()}>Try Again</button>
        </div>
      )}
    </div>
  );
}

export default Connections;