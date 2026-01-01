

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
require('dotenv').config();

const app = express();
const upload = multer();

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

app.listen(3000, () => {
    console.log('API running on port 3000');
  });