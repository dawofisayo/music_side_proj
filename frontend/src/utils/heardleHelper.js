// utils/heardleHelpers.js

/**
 * Generate unique Heardle ID
 * @returns {string} - Unique ID like "h_abc123xyz"
 */
export function generateHeardleId() {
    // TODO: Generate random string prefixed with "h_"
    // Make it URL-safe (letters, numbers, underscore)
    // Length: 10-15 characters
    
    // Hint: Use crypto.randomUUID() or custom generator
  }
  
  /**
   * Validate Heardle data before saving
   * @param {object} heardleData - Complete heardle configuration
   * @returns {object} - { valid: boolean, errors: string[] }
   */
  export function validateHeardleData(heardleData) {
    // TODO: Check that all required fields are present:
    // - song.videoId exists
    // - song.startTimeSeconds is >= 0
    // - challenge.question is not empty
    // - challenge.acceptableAnswers has at least 1 answer
    
    // Return { valid: true, errors: [] } or { valid: false, errors: [...] }
  }