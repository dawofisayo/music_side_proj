

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
const upload = multer();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(cors());
app.use(express.json());

const AUDIO_SERVICE_URL = process.env.AUDIO_SERVICE_URL || 'http://localhost:8001';
const CROSSWORD_SERVICE_URL = process.env.CROSSWORD_SERVICE_URL || 'http://localhost:8003';


app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'api' });
  });


app.post('/api/identify', upload.single('audio'),  async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        // Create form data to send to Python service
        const formData = new FormData();
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });

        // call python audio service
        const response = await axios.post(`${AUDIO_SERVICE_URL}/recognize/file`, formData, {
            headers: formData.getHeaders()
        }
    );

    // return the result
    res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to identify audio' , 
            details: error.response?.data || error.message
        });
    }
});

app.post('/api/identify/youtube', async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: 'No YouTube URL provided' });
      }
  
      const response = await axios.post(
        `${AUDIO_SERVICE_URL}/recognize/youtube`,
        null,
        { 
          params: { url },
          timeout: 120000
        }
      );
  
      res.json(response.data);
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to identify YouTube audio',
        details: error.response?.data || error.message
      });
    }
  });

app.get('/api/crossword/daily', async (req, res) => {
    try {
      const date = req.query.date || new Date().toISOString().split('T')[0];
      
      // Call Python crossword service
      const response = await axios.get(`${CROSSWORD_SERVICE_URL}/daily`, {
        params: { date },
        timeout: 60000  // 60 second timeout for generation
      });
      
      res.json(response.data);
    } catch (error) {
      console.error('Error generating crossword:', error.response?.data || error.message);
      res.status(500).json({ 
        error: 'Failed to generate crossword',
        details: error.response?.data?.detail || error.message || 'Unknown error'
      });
    }
  });

  app.post('/api/crossword/check', async (req, res) => {
    try {
      const { date, answers } = req.body;
      
      // Call Python crossword service to check answers
      const response = await axios.post(`${CROSSWORD_SERVICE_URL}/check`, 
        { date, answers },
        { timeout: 10000 }
      );
      
      // Return just the results object, not the whole response
      res.json(response.data.results);
    } catch (error) {
      console.error('Error checking answers:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json({ 
        error: 'Failed to check answers',
        details: error.response?.data?.detail || error.message
      });
    }
  });

app.get('/api/crossword/reveal', async (req, res) => {
    try {
      const date = req.query.date || new Date().toISOString().split('T')[0];
      
      // Call Python crossword service to reveal answers
      const response = await axios.get(`${CROSSWORD_SERVICE_URL}/reveal`, {
        params: { date },
        timeout: 10000
      });
      
      // Return just the answers object to match frontend expectations
      res.json(response.data.answers);
    } catch (error) {
      console.error('Error revealing answers:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json({ 
        error: 'Failed to reveal answers',
        details: error.response?.data?.detail || error.message
      });
    }
  });

app.get('/api/youtube/views/:videoId', async (req, res) => {
    try {
      const { videoId } = req.params;
      const response = await axios.get(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${process.env.YOUTUBE_API_KEY}`
      );
      
      if (response.data.items && response.data.items.length > 0) {
        const views = response.data.items[0].statistics.viewCount;
        res.json({ views: parseInt(views) });
      } else {
        res.status(404).json({ error: 'Video not found' });
      }
    } catch (error) {
      console.error('YouTube API error:', error);
      res.status(500).json({ error: 'Failed to fetch views' });
    }
  });

// Connections daily puzzle
app.get('/api/connections/daily', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    // Check cache first
    const cacheKey = `connections_${date}`;
    if (connectionsCache.has(cacheKey)) {
      return res.json(connectionsCache.get(cacheKey));
    }
    
    // Generate new puzzle
    const theme = getDailyMusicTheme(date);
    const puzzle = await generateConnectionsPuzzle(theme);
    
    // Cache it
    connectionsCache.set(cacheKey, puzzle);
    
    res.json(puzzle);
  } catch (error) {
    console.error('Error generating connections:', error);
    res.status(500).json({ error: 'Failed to generate puzzle' });
  }
});

// Simple cache
const connectionsCache = new Map();

function getDailyMusicTheme(date) {
  const themes = [
    'Pop Music',
    'Hip Hop',
    'Rock Music', 
    '2010s Music',
    '90s Music',
    'R&B',
    'Country Music',
    'EDM',
  ];
  const dateNum = new Date(date).getDate();
  return themes[dateNum % themes.length];
}

async function generateConnectionsPuzzle(theme) {
  const prompt = `Create a Connections-style puzzle about ${theme}.

Generate 4 categories, each with 4 items (songs, artists, albums, etc.).

RULES:
1. Each category should be distinct but not too obvious
2. Items should only fit in ONE category (no overlap!)
3. Mix difficulty levels (1=easy, 4=hardest)
4. All items must be real and verifiable

DIFFICULTY GUIDE:
- Level 1 (Easy): Obvious grouping like "Songs by Taylor Swift"
- Level 2 (Medium): Requires some thought like "Songs from 2015"
- Level 3 (Hard): Trickier like "Songs with colors in the title"
- Level 4 (Hardest): Very subtle like "Songs that samples the same artist"

Return ONLY valid JSON:
{
  "groups": [
    {
      "category": "Category name",
      "items": ["Item 1", "Item 2", "Item 3", "Item 4"],
      "difficulty": 1
    },
    ...
  ]
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini', // Better for creative tasks
    messages: [
      { 
        role: 'system', 
        content: 'You create Connections puzzles. Categories must be distinct with no overlap between items. Output only valid JSON.' 
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.8, // Higher for creativity
  });

  const responseText = completion.choices[0].message.content;
  const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const data = JSON.parse(cleanedText);
  
  return {
    date: new Date().toISOString().split('T')[0],
    theme: theme,
    groups: data.groups
  };
}

app.listen(3000, () => {
    console.log('API running on port 3000');
  });