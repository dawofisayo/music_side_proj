#!/usr/bin/env python3
"""
Start script for Crossword Service
"""
import sys
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add the crossword-service directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import uvicorn

if __name__ == "__main__":
    print("🚀 Starting Crossword Service API Server...")
    print("📝 API Documentation: http://localhost:8003/docs")
    print("🔍 Health check: http://localhost:8003/health")
    print("\n⚡ Starting server on http://localhost:8003")
    
    uvicorn.run(
        "src.api:app", 
        host="0.0.0.0", 
        port=8003, 
        reload=True,
        reload_dirs=["src"]
    )

