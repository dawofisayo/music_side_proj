// API configuration
// In production, this will use the Vercel environment variable
// In development, it defaults to localhost:3000 (API server)
// API configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  'https://music-side-proj-backend.up.railway.app';  // ← Replace with your actual Railway API URL
