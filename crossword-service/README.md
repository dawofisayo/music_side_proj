# Crossword Service

Python FastAPI service for generating crossword puzzles, integrated from [Rperry2174/crossword-generator](https://github.com/Rperry2174/crossword-generator).

## Setup

1. Create and activate virtual environment:
```bash
cd crossword-service
python3.12 -m venv venv
source venv/bin/activate  # On macOS/Linux
# OR
venv\Scripts\activate  # On Windows
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables (create a `.env` file):
```env
LLM_PROVIDER=openai  # or 'anthropic', 'ollama', or 'mock'
OPENAI_API_KEY=sk-...  # if using OpenAI
ANTHROPIC_API_KEY=sk-ant-...  # if using Anthropic
OLLAMA_BASE_URL=http://localhost:11434  # if using Ollama
```

4. Start the service (make sure venv is activated):
```bash
source venv/bin/activate  # if not already activated
python start_server.py
```

The service will run on `http://localhost:8003`

## API Endpoints

- `GET /daily?date=YYYY-MM-DD` - Generate daily crossword for a specific date
- `GET /health` - Health check
- `GET /` - API info

## Integration with Node.js Backend

The Node.js backend (api/server.js) calls this service at `http://localhost:8003/daily`.

The service URL can be configured via environment variable:
```env
CROSSWORD_SERVICE_URL=http://localhost:8003
```

## Notes

- The `/daily` endpoint generates crosswords on-demand (not cached)
- Answer checking and revealing endpoints need to be implemented (currently return 501)
- The service uses the same daily theme system as the original Node.js implementation

