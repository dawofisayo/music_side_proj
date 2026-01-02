

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

const AUDIO_SERVICE_URL = process.env.AUDIO_SERVICE_URL || 'https://musicsideproj-audio-service.up.railway.app';
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

app.get('/api/youtube/metadata/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${process.env.YOUTUBE_API_KEY}`
    );
    
    if (!response.data.items || response.data.items.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const video = response.data.items[0];
    
    res.json({
      title: video.snippet.title,
      channelTitle: video.snippet.channelTitle,
      thumbnail: video.snippet.thumbnails.medium.url,
      duration: video.contentDetails.duration
    });
  } catch (error) {
    console.error('YouTube API error:', error);
    res.status(500).json({ error: 'Failed to fetch video metadata' });
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
    'Afrobeats',
  ];
  const dateNum = new Date(date).getDate();
  return themes[dateNum % themes.length];
}

async function generateConnectionsPuzzle(theme) {
  const prompt = `Create a Connections-style puzzle about ${theme}.

Generate 4 categories, each with 4 items (songs, artists, albums, etc.).

CRITICAL RULES:
1. Each category description MUST accurately describe ALL 4 items in that category
2. Verify that EVERY single item actually fits the category description - no exceptions!
3. Each item should only fit in ONE category (no overlap!)
4. All items must be real, verifiable, and well-known
5. Mix difficulty levels (1=easy, 4=hardest)
6. Categories should be distinct but not too obvious

VALIDATION CHECKLIST (verify before including):
- Does the category description match ALL 4 items? Check each one individually.
- If a category says "X with Y", does EVERY item actually have Y?
- If a category says "X that did Y", did ALL 4 actually do Y?
- Are the items correctly grouped or are you forcing them into the wrong category?

DIFFICULTY GUIDE:
- Level 1 (Easy): Obvious grouping like "Songs by Taylor Swift"
- Level 2 (Medium): Requires some thought like "Songs from 2015"
- Level 3 (Hard): Trickier like "Songs with colors in the title"
- Level 4 (Hardest): Very subtle like "Songs that sample the same artist"

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
    model: 'gpt-4o-mini',
    messages: [
      { 
        role: 'system', 
        content: 'You create Connections puzzles. CRITICAL: Every item in a category MUST actually match the category description. Verify each item individually. Categories must be distinct with no overlap. Output only valid JSON.' 
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7, // Slightly lower for more accuracy
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

// Generate unique Heardle ID
function generateHeardleId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'h_';
  for (let i = 0; i < 10; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

// In-memory storage for now (replace with database later)
const heardles = new Map();

// Create a new Heardle
app.post('/api/heardles', (req, res) => {
  try {
    const heardleData = req.body;
    
    // Generate unique ID
    const id = generateHeardleId();
    
    // Create heardle object
    const heardle = {
      id,
      ...heardleData,
      createdAt: new Date().toISOString(),
      stats: {
        plays: 0,
        completions: 0,
        totalAttempts: 0
      },
      isPublic: true,
      status: 'active'
    };
    
    // Store it
    heardles.set(id, heardle);
    
    // Return the ID - frontend will construct the URL using its own origin
    res.json({ 
      id,
      path: `/heardle/${id}`
    });
  } catch (error) {
    console.error('Error creating heardle:', error);
    res.status(500).json({ error: 'Failed to create Heardle' });
  }
});

// Get a Heardle by ID
app.get('/api/heardles/:id', (req, res) => {
  const { id } = req.params;
  const heardle = heardles.get(id);
  
  if (!heardle) {
    return res.status(404).json({ error: 'Heardle not found' });
  }
  
  res.json(heardle);
});

app.listen(3000, () => {
    console.log('API running on port 3000');
  });