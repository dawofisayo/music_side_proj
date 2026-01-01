# Vercel Deployment Guide

## Quick Setup

1. **Set Root Directory in Vercel:**
   - Go to your project settings in Vercel
   - Under "Build & Development Settings"
   - Set **Root Directory** to: `frontend`

2. **Build Settings (should auto-detect):**
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

## Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

### Required:
- `VITE_API_BASE_URL` - Your API server URL (e.g., `https://your-api.vercel.app` or `https://your-api.railway.app`)

### If deploying API separately:
- `OPENAI_API_KEY` - For Connections puzzle generation
- `YOUTUBE_API_KEY` - For Higher or Lower game
- `AUDIO_SERVICE_URL` - URL of your audio-service (if deployed separately)
- `CROSSWORD_SERVICE_URL` - URL of your crossword-service (if deployed separately)

## Deploying the API

The API (`api/` folder) needs to be deployed separately. Options:

1. **Vercel Serverless Functions** - Convert `api/server.js` to serverless functions
2. **Railway/Render/Fly.io** - Deploy as a Node.js service
3. **Separate Vercel Project** - Deploy the API as a separate Vercel project

## Building Locally

To test the build locally:

```bash
cd frontend
npm install
npm run build
```

The built files will be in `frontend/dist/`

