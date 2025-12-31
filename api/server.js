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

app.listen(3000, () => {
    console.log('API running on port 3000');
  });