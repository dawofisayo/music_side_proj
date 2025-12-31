const { OpenAI } = require('openai');
const CrosswordLayout = require('crossword-layout-generator');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Daily themes
const DAILY_THEMES = [
  { topic: 'Daniel Caesar', type: 'artist' },
  { topic: 'The Beatles', type: 'artist' },
  { topic: 'Drake', type: 'artist' },
  { topic: 'Beyoncé', type: 'artist' },
  { topic: '90s Hip Hop', type: 'era' },
  { topic: '80s Rock', type: 'era' },
  { topic: 'Classic Rock', type: 'era' },
  { topic: 'Pop Music', type: 'genre' },
  { topic: 'Hip Hop', type: 'genre' },
  { topic: 'R&B', type: 'genre' },
];

function getDailyTheme(date) {
  const dateNum = new Date(date).getDate();
  return DAILY_THEMES[dateNum % DAILY_THEMES.length];
}

// AI generates a word list for the theme
async function generateWordList(theme) {
  const prompt = `Generate a list of 12-15 words related to: ${theme.topic}

Words should be:
- 3-8 letters long
- Mix of lengths (some short, some long)
- Specific to ${theme.topic} (album names, song titles, artist names, years, slang, venues, etc.)
- Single words or abbreviations (no spaces)
- Examples: VIEWS, OVO, DRAKE, HOTLINE, SCORPION, etc.

Return ONLY a JSON array of uppercase words, no explanations:
["WORD1", "WORD2", "WORD3", ...]`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You generate word lists. Output only valid JSON array of uppercase words.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
    });

    const responseText = completion.choices[0].message.content;
    const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    let words = JSON.parse(cleanedText);
    
    // Clean up
    words = words.map(w => w.toUpperCase().replace(/[^A-Z0-9]/g, '')).filter(w => w.length >= 3 && w.length <= 8);
    
    return words;
  } catch (error) {
    console.error('Failed to generate word list:', error.message);
    return getFallbackWords(theme);
  }
}

// AI generates clues for the words that made it into the puzzle
async function generateClues(words, theme) {
  const wordList = words.map(w => `- ${w}`).join('\n');
  
  const prompt = `Generate creative crossword clues for these ${theme.topic}-related words:

${wordList}

Make clues:
- Specific trivia about ${theme.topic} (e.g., "Drake's 2016 album" not "A music album")
- Clever but fair
- Varied difficulty
- Engaging

Return ONLY valid JSON object mapping words to clues:
{
  "WORD1": "clue text here",
  "WORD2": "clue text here",
  ...
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You write specific, interesting crossword clues. Output only valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
    });

    const responseText = completion.choices[0].message.content;
    const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error('Failed to generate clues:', error.message);
    // Fallback to generic clues
    const clues = {};
    words.forEach(word => {
      clues[word] = `${theme.topic}-related term`;
    });
    return clues;
  }
}

function getFallbackWords(theme) {
  const wordLists = {
    'Drake': ['DRAKE', 'VIEWS', 'OVO', 'TORONTO', 'HOTLINE', 'GODS', 'PLAN', 'SCORPION', 'NICE', 'WHAT', 'TROPHIES', 'ENERGY'],
    'Taylor Swift': ['TAYLOR', 'SWIFT', 'ERAS', 'RED', 'SPEAK', 'NOW', 'LOVER', 'FOLKLORE', 'EVERMORE', 'MIDNIGHTS', 'SHAKE', 'BLANK'],
    'The Beatles': ['BEATLES', 'JOHN', 'PAUL', 'RINGO', 'ABBEY', 'ROAD', 'YELLOW', 'HELP', 'YESTERDAY', 'LUCY', 'PENNY', 'LANE'],
  };
  
  return wordLists[theme.topic] || ['MUSIC', 'SONG', 'BEAT', 'TUNE', 'BAND', 'ALBUM', 'TRACK', 'SOUND', 'VOICE', 'TEMPO', 'NOTES', 'CHORD'];
}

// Generate a simple fallback crossword if library fails
async function generateFallbackCrossword(theme) {
  const grid = Array(7).fill(null).map(() => Array(7).fill('X'));
  const positions = {};
  const wordsObject = {};
  
  // SWIFT across at (0,0)
  const word1 = 'SWIFT';
  const word1Id = '1A';
  for (let i = 0; i < word1.length; i++) {
    grid[0][i] = word1Id;
  }
  positions[word1Id] = { row: 0, col: 0, direction: 'across', length: word1.length };
  wordsObject[word1Id] = {
    answer: word1,
    clue: `${theme.topic} is known for being this`
  };
  
  // SONG down at (0,0) - intersects with SWIFT at S
  const word2 = 'SONG';
  const word2Id = '2D';
  for (let i = 0; i < word2.length; i++) {
    grid[i][0] = word2Id;
  }
  positions[word2Id] = { row: 0, col: 0, direction: 'down', length: word2.length };
  wordsObject[word2Id] = {
    answer: word2,
    clue: 'A musical composition'
  };
  
  return {
    grid,
    positions,
    words: wordsObject
  };
}

async function generateCrossword(theme, seed) {
  let words = await generateWordList(theme);
  
  let layout = null;
  let attempts = 0;
  const maxAttempts = 5;
  
  while (!layout && attempts < maxAttempts) {
    try {
      const shuffled = [...words];
      let rng = seed;
      for (let i = shuffled.length - 1; i > 0; i--) {
        rng = (rng * 9301 + 49297) % 233280;
        const j = Math.floor((rng / 233280) * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      const wordCount = Math.max(8, words.length - attempts * 2);
      const wordsToUse = shuffled.slice(0, wordCount);
      const wordsForLibrary = wordsToUse.map(word => ({ answer: word }));
      
      layout = CrosswordLayout.generateLayout(wordsForLibrary);
      
      if (layout) {
        let result = layout.result || layout.words || layout;
        let rows = layout.rows;
        let cols = layout.cols;
        
        if (!Array.isArray(result) && layout.layout) {
          result = layout.layout;
        }
        
        if (Array.isArray(result) && result.length > 0) {
          if (rows && cols) {
            layout.result = result;
            layout.rows = rows;
            layout.cols = cols;
            break;
          } else {
            let maxRow = 0, maxCol = 0;
            result.forEach(item => {
              const endRow = item.orientation === 'across' ? item.starty : item.starty + item.answer.length - 1;
              const endCol = item.orientation === 'across' ? item.startx + item.answer.length - 1 : item.startx;
              maxRow = Math.max(maxRow, endRow);
              maxCol = Math.max(maxCol, endCol);
            });
            layout.result = result;
            layout.rows = maxRow + 1;
            layout.cols = maxCol + 1;
            break;
          }
        }
      }
    } catch (error) {
      // Silently retry with fewer words
    }
    
    attempts++;
  }
  
  if (!layout || !layout.result || !Array.isArray(layout.result) || layout.result.length === 0) {
    console.error('Library failed to generate layout, using fallback');
    return generateFallbackCrossword(theme);
  }
  
  // Get the words that actually made it into the puzzle
  const usedWords = layout.result.map(item => {
    // Handle different property names the library might use
    return (item.answer || item.word || item.text || '').toUpperCase();
  }).filter(w => w.length > 0);
  
  // Generate clues for those specific words
  const clues = await generateClues(usedWords, theme);
  
  // First, calculate the actual grid size needed from all word positions
  let maxRow = 0;
  let maxCol = 0;
  
  layout.result.forEach((item) => {
    const answer = (item.answer || item.word || item.text || '').toUpperCase();
    const orientation = item.orientation || item.direction || 'across';
    const startRow = item.starty !== undefined ? item.starty : (item.row !== undefined ? item.row : 0);
    const startCol = item.startx !== undefined ? item.startx : (item.col !== undefined ? item.col : 0);
    
    if (answer && answer.length > 0) {
      if (orientation === 'across') {
        maxRow = Math.max(maxRow, startRow);
        maxCol = Math.max(maxCol, startCol + answer.length - 1);
      } else {
        maxRow = Math.max(maxRow, startRow + answer.length - 1);
        maxCol = Math.max(maxCol, startCol);
      }
    }
  });
  
  // Create grid with proper size (add 1 for 0-indexed, ensure minimum 7x7)
  const gridRows = Math.max(7, maxRow + 1);
  const gridCols = Math.max(7, maxCol + 1);
  const grid = Array(gridRows).fill(null).map(() => Array(gridCols).fill('X'));
  const positions = {};
  const wordsObject = {};
  
  layout.result.forEach((item, idx) => {
    // Handle different property names
    const answer = (item.answer || item.word || item.text || '').toUpperCase();
    const orientation = item.orientation || item.direction || 'across';
    const startRow = item.starty !== undefined ? item.starty : (item.row !== undefined ? item.row : 0);
    const startCol = item.startx !== undefined ? item.startx : (item.col !== undefined ? item.col : 0);
    
    if (!answer || answer.length === 0) {
      return;
    }
    
    const wordId = `${idx + 1}${orientation === 'across' ? 'A' : 'D'}`;
    
    // Fill grid - now we know the grid is large enough
    for (let i = 0; i < answer.length; i++) {
      const row = orientation === 'across' ? startRow : startRow + i;
      const col = orientation === 'across' ? startCol + i : startCol;
      if (row >= 0 && row < gridRows && col >= 0 && col < gridCols) {
        grid[row][col] = wordId;
      }
    }
    
    // Store position
    positions[wordId] = {
      row: startRow,
      col: startCol,
      direction: orientation,
      length: answer.length
    };
    
    // Store word and clue
    wordsObject[wordId] = {
      answer: answer,
      clue: clues[answer] || `${theme.topic}-related term`
    };
  });
  
  return {
    grid,
    positions,
    words: wordsObject
  };
}

const puzzleCache = new Map();

async function getDailyCrossword(date) {
  const dateStr = date || new Date().toISOString().split('T')[0];
  
  if (puzzleCache.has(dateStr)) {
    return puzzleCache.get(dateStr);
  }
  
  const theme = getDailyTheme(dateStr);
  
  // Generate seed from date for consistency
  const dateParts = dateStr.split('-').map(Number);
  const seed = dateParts[0] * 10000 + dateParts[1] * 100 + dateParts[2];
  
  try {
    const { grid, positions, words } = await generateCrossword(theme, seed);
    
    const puzzle = {
      date: dateStr,
      template: { grid, positions },
      words: words,
      theme: theme
    };
    
    puzzleCache.set(dateStr, puzzle);
    return puzzle;
    
  } catch (error) {
    console.error('Crossword generation failed completely:', error.message);
    throw error;
  }
}

module.exports = { getDailyCrossword };