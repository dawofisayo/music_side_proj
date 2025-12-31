

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
require('dotenv').config();

const { getDailyCrossword } = require('./crossword');


const app = express();
const upload = multer();

app.use(cors());
app.use(express.json());

const AUDIO_SERVICE_URL = process.env.AUDIO_SERVICE_URL || 'http://localhost:8001';


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
      const puzzle = await getDailyCrossword(date);
      
      // Don't send answers to frontend!
      const puzzleForClient = {
        date: puzzle.date,
        template: puzzle.template,
        clues: Object.entries(puzzle.words).reduce((acc, [key, value]) => {
          acc[key] = { clue: value.clue, length: value.answer.length };
          return acc;
        }, {}),
        theme: puzzle.theme
      };
      
      res.json(puzzleForClient);
    } catch (error) {
      console.error('Error generating crossword:', error);
      res.status(500).json({ 
        error: 'Failed to generate crossword',
        details: error.message || 'Unknown error'
      });
    }
  });

app.post('/api/crossword/check', async (req, res) => {
    try {
      const { date, answers } = req.body;
      const puzzle = await getDailyCrossword(date);
      
      const results = {};
      for (const [key, userAnswer] of Object.entries(answers)) {
        if (!puzzle.words[key]) {
          results[key] = {
            correct: false,
            answer: 'Unknown clue'
          };
          continue;
        }
        
        const userAnswerTrimmed = (userAnswer || '').trim().toUpperCase().replace(/\s+/g, '');
        const correctAnswer = puzzle.words[key].answer.toUpperCase().replace(/\s+/g, '');
        
        results[key] = {
          correct: userAnswerTrimmed === correctAnswer,
          answer: puzzle.words[key].answer
        };
      }
      
      res.json(results);
    } catch (error) {
      console.error('Error checking answers:', error);
      res.status(500).json({ error: 'Failed to check answers', details: error.message });
    }
  });

app.get('/api/crossword/reveal', async (req, res) => {
    try {
      const date = req.query.date || new Date().toISOString().split('T')[0];
      const puzzle = await getDailyCrossword(date);
      
      // Return all answers
      const answers = {};
      Object.entries(puzzle.words).forEach(([key, value]) => {
        answers[key] = value.answer;
      });
      
      res.json(answers);
    } catch (error) {
      console.error('Error revealing answers:', error);
      res.status(500).json({ error: 'Failed to reveal answers', details: error.message });
    }
  });

app.listen(3000, () => {
    console.log('API running on port 3000');
  });