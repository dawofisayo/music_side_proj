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
    import os
    
    port = int(os.environ.get("PORT", 8003))
    
    print("🚀 Starting Crossword Service API Server...")
    print(f"📝 API Documentation: http://localhost:{port}/docs")
    print(f"🔍 Health check: http://localhost:{port}/health")
    print(f"\n⚡ Starting server on http://0.0.0.0:{port}")
    
    uvicorn.run(
        "src.api:app", 
        host="0.0.0.0", 
        port=port,  # ← Use the PORT variable here, not hardcoded 8003
        reload=True,
        reload_dirs=["src"]
    )
