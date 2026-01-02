/**
 * Extract YouTube video ID from various URL formats
 */
import { API_BASE_URL } from '../config';
export function extractYouTubeId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  }
  
  /**
   * Fetch video metadata from backend API
   */
  export async function fetchVideoMetadata(videoId) {
    const response = await fetch(`${API_BASE_URL}/api/youtube/metadata/${videoId}`);
    
    if (!response.ok) {
      let errorMessage = 'Failed to fetch video metadata';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        // If response is not JSON (e.g., HTML error page), use status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Server returned invalid response format');
    }
    
    return response.json();
  }
  
  /**
   * Format seconds into MM:SS
   */
  export function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }