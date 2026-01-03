// API configuration
// In production, this will use the Vercel environment variable
// In development, it defaults to localhost:3000 (API server)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.MODE === 'production' ? '' : 'http://localhost:3000');


  
