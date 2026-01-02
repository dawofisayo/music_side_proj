import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';
import './Crossword.css';

function Crossword() {
  const [puzzle, setPuzzle] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedClue, setSelectedClue] = useState(null);
  const [direction, setDirection] = useState('across');
  const [results, setResults] = useState(null);
  const [revealedAnswers, setRevealedAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const gridRef = useRef(null);
  const cluesRef = useRef({});

  useEffect(() => {
    loadPuzzle();
  }, []);

  // Auto-scroll to active clue
  useEffect(() => {
    if (selectedClue && cluesRef.current[selectedClue]) {
      cluesRef.current[selectedClue].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedClue]);

  const loadPuzzle = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/crossword/daily`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to load puzzle:', {
          status: response.status,
          statusText: response.statusText,
          url: `${API_BASE_URL}/api/crossword/daily`,
          error: errorText
        });
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      setPuzzle(data);
      
      // Initialize empty user answers for each clue
      const initialAnswers = {};
      if (data.clues) {
        Object.keys(data.clues).forEach(key => {
          initialAnswers[key] = '';
        });
      }
      setUserAnswers(initialAnswers);
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to load puzzle:', {
        error: error.message,
        url: `${API_BASE_URL}/api/crossword/daily`,
        apiBaseUrl: API_BASE_URL,
        stack: error.stack
      });
      setLoading(false);
    }
  };

  // Convert grid position to clue ID (handles intersections with multiple IDs)
  const getCellClue = (row, col) => {
    if (!puzzle || !puzzle.template || !puzzle.template.grid) return null;
    if (row < 0 || row >= puzzle.template.grid.length) return null;
    if (col < 0 || col >= puzzle.template.grid[row].length) return null;
    const cell = puzzle.template.grid[row][col];
    if (cell === 'X') return null;
    // If cell has multiple IDs (intersection), return array
    if (cell.includes('/')) {
      return cell.split('/');
    }
    return cell;
  };

  // Get position within word for a cell
  const getCellPosition = (row, col, clueId) => {
    if (!puzzle || !puzzle.template || !puzzle.template.positions) return -1;
    const position = puzzle.template.positions[clueId];
    if (!position) return -1;
    
    // Check if this cell is actually part of this word
    if (position.direction === 'across' || position.direction === 'horizontal') {
      // For across: row must match exactly, col must be in range
      if (row !== position.row) return -1;
      if (col < position.col || col >= position.col + position.length) return -1;
      return col - position.col;
    } else {
      // For down: col must match exactly, row must be in range
      if (col !== position.col) return -1;
      if (row < position.row || row >= position.row + position.length) return -1;
      return row - position.row;
    }
  };

  // Handle cell click
  const handleCellClick = (row, col) => {
    const clueId = getCellClue(row, col);
    console.log(`Clicked (${row},${col}), cell contains:`, clueId);
    if (!clueId) return;
    
    // Handle intersection cells (clueId is an array)
    if (Array.isArray(clueId)) {
      // If clicking same cell, toggle between the two clues
      if (selectedCell && selectedCell.row === row && selectedCell.col === col) {
        const currentIndex = clueId.indexOf(selectedClue);
        const nextIndex = (currentIndex + 1) % clueId.length;
        setSelectedClue(clueId[nextIndex]);
        const pos = puzzle.template.positions[clueId[nextIndex]];
        setDirection(pos?.direction || 'across');
      } else {
        // Select first clue (prefer across)
        const acrossClue = clueId.find(id => id.includes('A'));
        setSelectedCell({ row, col });
        setSelectedClue(acrossClue || clueId[0]);
        const pos = puzzle.template.positions[acrossClue || clueId[0]];
        setDirection(pos?.direction || 'across');
      }
    } else {
      // Single clue in this cell
      if (selectedCell && selectedCell.row === row && selectedCell.col === col) {
        setDirection(direction === 'across' ? 'down' : 'across');
      } else {
        setSelectedCell({ row, col });
        setSelectedClue(clueId);
      }
    }
  };

  // Handle keyboard input
  const handleKeyDown = (e) => {
    if (!selectedCell || !puzzle || !selectedClue) return;
    
    const { row, col } = selectedCell;
    const clueId = selectedClue; // Use selected clue, not the cell's clue
    const pos = puzzle.template.positions[clueId];
    if (!pos) return;
    
    // Verify this cell is actually part of the selected clue
    const position = getCellPosition(row, col, clueId);
    console.log(`Cell (${row},${col}) for clue ${clueId}: position = ${position}, word length = ${pos.length}`);

    if (position < 0 || position >= pos.length) return; // Cell is not part of this word
    
    if (e.key.length === 1 && e.key.match(/[a-zA-Z0-9]/)) {
      // Letter input
      const newAnswers = { ...userAnswers };
      if (!newAnswers[clueId]) {
        newAnswers[clueId] = ''.padEnd(pos.length, ' ');
      }
      
      const answer = newAnswers[clueId].split('');
      answer[position] = e.key.toUpperCase();
      newAnswers[clueId] = answer.join(''); // Keep full length, don't trim
      
      // Update intersecting words at this cell (only if they actually intersect)
      const allCluesAtCell = getAllCluesAtCell(row, col);
      allCluesAtCell.forEach(otherClueId => {
        if (otherClueId !== clueId) {
          const otherPos = puzzle.template.positions[otherClueId];
          if (otherPos) {
            const otherPosition = getCellPosition(row, col, otherClueId);
            if (otherPosition >= 0 && otherPosition < otherPos.length) {
              if (!newAnswers[otherClueId]) {
                newAnswers[otherClueId] = ''.padEnd(otherPos.length, ' ');
              }
              const otherAnswer = newAnswers[otherClueId].split('');
              otherAnswer[otherPosition] = e.key.toUpperCase();
              newAnswers[otherClueId] = otherAnswer.join(''); // Keep full length
            }
          }
        }
      });
      
      setUserAnswers(newAnswers);
      
      // Move to next cell in the selected clue's direction
      moveToNextCell(row, col, clueId);
      
    } else if (e.key === 'Backspace') {
      // Delete
      const newAnswers = { ...userAnswers };
      if (newAnswers[clueId]) {
        const answer = newAnswers[clueId].split('');
        answer[position] = ' ';
        newAnswers[clueId] = answer.join(''); // Keep full length
        
        // Also clear in intersecting words
        const allCluesAtCell = getAllCluesAtCell(row, col);
        allCluesAtCell.forEach(otherClueId => {
          if (otherClueId !== clueId && newAnswers[otherClueId]) {
            const otherPos = puzzle.template.positions[otherClueId];
            if (otherPos) {
              const otherPosition = getCellPosition(row, col, otherClueId);
              if (otherPosition >= 0 && otherPosition < otherPos.length) {
                const otherAnswer = newAnswers[otherClueId].split('');
                otherAnswer[otherPosition] = ' ';
                newAnswers[otherClueId] = otherAnswer.join(''); // Keep full length
              }
            }
          }
        });
        
        setUserAnswers(newAnswers);
      }
      moveToPrevCell(row, col, clueId);
      
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || 
               e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      // Arrow navigation
      e.preventDefault();
      navigateGrid(e.key);
    }
  };

  // Get all clue IDs that use a specific cell
  const getAllCluesAtCell = (row, col) => {
    if (!puzzle || !puzzle.template || !puzzle.template.positions) return [];
    const clues = [];
    Object.entries(puzzle.template.positions).forEach(([clueId, pos]) => {
      const { row: startRow, col: startCol, direction, length } = pos;
      for (let i = 0; i < length; i++) {
        const cellRow = direction === 'across' ? startRow : startRow + i;
        const cellCol = direction === 'across' ? startCol + i : startCol;
        if (cellRow === row && cellCol === col) {
          clues.push(clueId);
          break;
        }
      }
    });
    return clues;
  };

  const moveToNextCell = (row, col, clueId) => {
    if (!puzzle || !puzzle.template || !puzzle.template.positions) return;
    const pos = puzzle.template.positions[clueId];
    if (!pos) return;
    
    const currentPosition = getCellPosition(row, col, clueId);
    const nextPosition = currentPosition + 1;
    
    if (nextPosition < pos.length) {
      if (pos.direction === 'across' || pos.direction === 'horizontal') {  // ← ADD horizontal check
        const nextCol = pos.col + nextPosition;
        if (nextCol < (puzzle.template.grid[0]?.length || 15)) {
          setSelectedCell({ row, col: nextCol });
          setSelectedClue(clueId);
        }
      } else {  // vertical or down
        const nextRow = pos.row + nextPosition;
        if (nextRow < (puzzle.template.grid?.length || 15)) {
          setSelectedCell({ row: nextRow, col });
          setSelectedClue(clueId);
        }
      }
    }
  };
  
  const moveToPrevCell = (row, col, clueId) => {
    if (!puzzle || !puzzle.template || !puzzle.template.positions) return;
    const pos = puzzle.template.positions[clueId];
    if (!pos) return;
    
    const currentPosition = getCellPosition(row, col, clueId);
    const prevPosition = currentPosition - 1;
    
    if (prevPosition >= 0) {
      if (pos.direction === 'across' || pos.direction === 'horizontal') {  // ← ADD horizontal check
        const prevCol = pos.col + prevPosition;
        if (prevCol >= 0) {
          setSelectedCell({ row, col: prevCol });
          setSelectedClue(clueId);
        }
      } else {  // vertical or down
        const prevRow = pos.row + prevPosition;
        if (prevRow >= 0) {
          setSelectedCell({ row: prevRow, col });
          setSelectedClue(clueId);
        }
      }
    }
  };

  const navigateGrid = (key) => {
    if (!selectedCell || !puzzle || !puzzle.template || !puzzle.template.grid) return;
    const { row, col } = selectedCell;
    
    const maxRow = puzzle.template.grid.length - 1;
    const maxCol = puzzle.template.grid[0]?.length - 1 || 0;
    
    let newRow = row;
    let newCol = col;
    
    if (key === 'ArrowUp') newRow = Math.max(0, row - 1);
    if (key === 'ArrowDown') newRow = Math.min(maxRow, row + 1);
    if (key === 'ArrowLeft') newCol = Math.max(0, col - 1);
    if (key === 'ArrowRight') newCol = Math.min(maxCol, col + 1);
    
    const newClueId = getCellClue(newRow, newCol);
    if (newClueId) {
      setSelectedCell({ row: newRow, col: newCol });
      setSelectedClue(newClueId);
    }
  };

  const checkAnswers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/crossword/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: puzzle.date,
          answers: userAnswers
        })
      });
      
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Failed to check answers:', error);
    }
  };

  const revealAnswers = async () => {
    if (!puzzle) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/crossword/reveal?date=${puzzle.date}`);
      const revealed = await response.json();
      
      setRevealedAnswers(revealed);
      
      // Also update userAnswers to show the revealed letters
      const updatedAnswers = { ...userAnswers };
      Object.entries(revealed).forEach(([clueId, answer]) => {
        updatedAnswers[clueId] = answer;
      });
      setUserAnswers(updatedAnswers);
    } catch (error) {
      console.error('Failed to reveal answers:', error);
    }
  };

  const handleClueClick = (clueId) => {
    if (!puzzle || !puzzle.template || !puzzle.template.positions) return;
    const pos = puzzle.template.positions[clueId];
    if (!pos) return;
    setSelectedCell({ row: pos.row, col: pos.col });
    setSelectedClue(clueId);
    setDirection(pos.direction);
  };

  // Render grid
  const renderGrid = () => {
    if (!puzzle || !puzzle.template || !puzzle.template.grid) return null;

    return (
      <div className="crossword-grid-container" tabIndex="0" onKeyDown={handleKeyDown} ref={gridRef}>
        <div className="crossword-grid">
          {puzzle.template.grid.map((row, rowIdx) => (
            <div key={rowIdx} className="grid-row">
              {row.map((cell, colIdx) => {
                if (cell === 'X') {
                  return <div key={colIdx} className="grid-cell blocked" />;
                }
                
                // Handle intersection cells with multiple clue IDs
                const clueIds = cell.includes('/') ? cell.split('/') : [cell];
                
                const isSelected = selectedCell && selectedCell.row === rowIdx && selectedCell.col === colIdx;
                const isInSelectedWord = clueIds.includes(selectedClue);
                
                // Determine which clue to use for this cell
                // CRITICAL: Only show letters from clues that actually use this cell
                let displayClueId = null;
                let letter = '';
                
                // Priority: selected clue (if it uses this cell) > first clue with an answer > first clue
                if (isInSelectedWord) {
                  // Verify the selected clue actually uses this cell by checking position
                  const selectedPos = puzzle.template.positions?.[selectedClue];
                  if (selectedPos) {
                    const checkPos = getCellPosition(rowIdx, colIdx, selectedClue);
                    if (checkPos >= 0 && checkPos < selectedPos.length) {
                      displayClueId = selectedClue;
                    }
                  }
                }
                
                // If selected clue doesn't use this cell, find another clue that does
                if (!displayClueId) {
                  for (const cid of clueIds) {
                    const cpos = puzzle.template.positions?.[cid];
                    if (cpos) {
                      const checkPos = getCellPosition(rowIdx, colIdx, cid);
                      if (checkPos >= 0 && checkPos < cpos.length) {
                        // This clue uses this cell
                        if (userAnswers[cid] || revealedAnswers[cid]) {
                          displayClueId = cid;
                          break;
                        } else if (!displayClueId) {
                          displayClueId = cid; // Use first valid clue as fallback
                        }
                      }
                    }
                  }
                }
                
                // Only display letter if we found a valid clue for this cell
                if (displayClueId) {
                  const position = getCellPosition(rowIdx, colIdx, displayClueId);
                  const isRevealed = revealedAnswers[displayClueId] !== undefined;
                  const pos = puzzle.template.positions?.[displayClueId];
                  const answerLength = pos ? pos.length : 0;
                  
                  // Get answer, ensuring it's the correct length
                  let answer = isRevealed ? revealedAnswers[displayClueId] : (userAnswers[displayClueId] || '');
                  // Pad answer to correct length if needed
                  if (answer.length < answerLength) {
                    answer = answer.padEnd(answerLength, ' ');
                  }
                  // Trim to correct length if too long (shouldn't happen, but safety check)
                  if (answer.length > answerLength) {
                    answer = answer.substring(0, answerLength);
                  }
                  
                  letter = answer && position >= 0 && position < answer.length ? answer[position] : '';
                }
                
                // Find all words that start at this cell
                const wordsStartingHere = [];
                if (puzzle.template.positions) {
                  // Check all clue IDs that might start at this cell
                  clueIds.forEach(id => {
                    const pos = puzzle.template.positions[id];
                    if (pos && pos.row === rowIdx && pos.col === colIdx) {
                      wordsStartingHere.push(id);
                    }
                  });
                }
                
                const displayLetter = letter;
                
                const isCorrect = displayClueId && results && results[displayClueId]?.correct;
                const isWrong = displayClueId && results && results[displayClueId] && !results[displayClueId].correct;
                const cellIsRevealed = displayClueId && revealedAnswers[displayClueId] !== undefined;
                
                return (
                  <div
                    key={colIdx}
                    className={`grid-cell ${isSelected ? 'selected' : ''} ${isInSelectedWord ? 'highlighted' : ''} ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''} ${cellIsRevealed ? 'revealed' : ''}`}
                    onClick={() => handleCellClick(rowIdx, colIdx)}
                  >
                    {wordsStartingHere.length > 0 && (
                      <span className="cell-number">
                        {wordsStartingHere.join('/')}
                      </span>
                    )}
                    {displayLetter && <span className="cell-letter">{displayLetter}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="crossword-container">
        <div className="loading">🎵 Generating today's music puzzle...</div>
      </div>
    );
  }

  if (!puzzle) {
    return <div className="crossword-container"><p>Failed to load puzzle</p></div>;
  }

  if (!puzzle.clues || typeof puzzle.clues !== 'object') {
    return <div className="crossword-container"><p>Invalid puzzle data</p></div>;
  }

  const acrossClues = Object.entries(puzzle.clues).filter(([key]) => key.includes('A'));
  const downClues = Object.entries(puzzle.clues).filter(([key]) => key.includes('D'));
  const allCorrect = results && Object.values(results).every(r => r.correct);

  return (
    <div className="crossword-container">
      <div className="crossword-header">
        <h1>📝 Daily Music Crossword</h1>
        <p className="date">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        {puzzle.theme && <p className="theme">Today's Theme: {puzzle.theme.topic}</p>}
      </div>

      <div className="crossword-main">
        <div className="grid-section">
          {renderGrid()}
        </div>

        <div className="clues-section">
          <div className="clues-section-inner">
            <div className="clues-group">
              <h3>ACROSS</h3>
              {acrossClues.map(([key, data]) => (
                <div
                  key={key}
                  ref={(el) => (cluesRef.current[key] = el)}
                  className={`clue ${selectedClue === key ? 'active' : ''}`}
                  onClick={() => handleClueClick(key)}
                >
                  <span className="clue-number">{key}</span>
                  <span className="clue-text">{data.clue}</span>
                  {results && results[key] && (
                    <span className={`clue-result ${results[key].correct ? 'correct' : 'wrong'}`}>
                      {results[key].correct ? '✓' : '✗'}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="clues-group">
              <h3>DOWN</h3>
              {downClues.map(([key, data]) => (
                <div
                  key={key}
                  ref={(el) => (cluesRef.current[key] = el)}
                  className={`clue ${selectedClue === key ? 'active' : ''}`}
                  onClick={() => handleClueClick(key)}
                >
                  <span className="clue-number">{key}</span>
                  <span className="clue-text">{data.clue}</span>
                  {results && results[key] && (
                    <span className={`clue-result ${results[key].correct ? 'correct' : 'wrong'}`}>
                      {results[key].correct ? '✓' : '✗'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Clue Banner */}
      {selectedClue && puzzle?.clues?.[selectedClue] && (
        <div className="clue-banner">
          <div className="clue-banner-content">
            <span className="clue-banner-number">{selectedClue}</span>
            <span className="clue-banner-text">{puzzle.clues[selectedClue].clue}</span>
            {results && results[selectedClue] && (
              <span className={`clue-banner-result ${results[selectedClue].correct ? 'correct' : 'wrong'}`}>
                {results[selectedClue].correct ? '✓' : '✗'}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="crossword-footer">
        <div className="footer-buttons">
          <button onClick={checkAnswers} className="check-button">
            Check Puzzle
          </button>
          <button 
            onClick={revealAnswers} 
            className="reveal-button"
            disabled={Object.keys(revealedAnswers).length > 0}
          >
            {Object.keys(revealedAnswers).length > 0 ? '✓ Answers Revealed' : '🔓 Reveal Answers'}
          </button>
        </div>
        
        {allCorrect && (
          <div className="success">
            <h2>🎉 Perfect!</h2>
            <p>You solved today's puzzle!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Crossword;