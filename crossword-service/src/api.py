from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import json
import uuid
from datetime import datetime
from zoneinfo import ZoneInfo
from src.crossword_generator import CrosswordGenerator
from src.models import Direction
from src.llm_service import LLMService

app = FastAPI(title="Crossword Generator API", version="1.0.0")

# In-memory storage for clue data (could be replaced with Redis/database in production)
clue_storage: Dict[str, Dict[str, str]] = {}

# In-memory storage for daily puzzle answers (could be replaced with Redis/database in production)
# Format: { "date": { "clue_id": "ANSWER" } }
daily_answers: Dict[str, Dict[str, str]] = {}

# Daily themes (matching the Node.js version)
DAILY_THEMES = [
    {"topic": "Daniel Caesar", "type": "artist"},
    {"topic": "SZA", "type": "artist"},
    {"topic": "Drake", "type": "artist"},
    {"topic": "Beyoncé", "type": "artist"},
    {"topic": "90s Hip Hop", "type": "era"},
    {"topic": "80s Rock", "type": "era"},
    {"topic": "Classic Rock", "type": "era"},
    {"topic": "Pop Music", "type": "genre"},
    {"topic": "Hip Hop", "type": "genre"},
    {"topic": "R&B", "type": "genre"},
]

def get_daily_theme(date_str: str) -> Dict[str, str]:
    """Get theme for a specific date"""
    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
    date_num = date_obj.day
    return DAILY_THEMES[date_num % len(DAILY_THEMES)]

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class WordListRequest(BaseModel):
    words: List[str]

class TopicRequest(BaseModel):
    topic: str

class TopicWordsResponse(BaseModel):
    words: List[str]
    topic: str
    success: bool
    message: str
    crossword_id: Optional[str] = None

class ClueData(BaseModel):
    word: str
    clue: str

class CluesResponse(BaseModel):
    clues: Dict[str, str]  # word -> clue mapping
    crossword_id: str
    success: bool
    message: str

class WordPlacementResponse(BaseModel):
    word: str
    start_row: int
    start_col: int
    direction: str
    number: int

class CrosswordResponse(BaseModel):
    grid: List[List[Optional[str]]]
    width: int
    height: int
    word_placements: List[WordPlacementResponse]
    success: bool
    message: str
    crossword_id: Optional[str] = None

@app.get("/")
async def root():
    return {"message": "Crossword Generator API", "status": "running"}

@app.post("/generate-crossword", response_model=CrosswordResponse)
async def generate_crossword(request: WordListRequest):
    try:
        # Validate input
        if not request.words or len(request.words) < 2:
            raise HTTPException(
                status_code=400, 
                detail="Please provide at least 2 words"
            )
        
        # Clean and validate words
        cleaned_words = []
        for word in request.words:
            cleaned_word = word.strip().upper()
            if not cleaned_word.isalpha():
                raise HTTPException(
                    status_code=400,
                    detail=f"Word '{word}' contains invalid characters. Only letters allowed."
                )
            if len(cleaned_word) < 2:
                raise HTTPException(
                    status_code=400,
                    detail=f"Word '{word}' is too short. Minimum 2 letters required."
                )
            cleaned_words.append(cleaned_word)
        
        # Generate crossword
        generator = CrosswordGenerator(cleaned_words)
        crossword = generator.generate_crossword()
        
        # Check if crossword was successfully generated
        if len(crossword.word_placements) < 2:
            return CrosswordResponse(
                grid=[],
                width=0,
                height=0,
                word_placements=[],
                success=False,
                message=f"Could not generate a valid crossword with the given words. Only {len(crossword.word_placements)} words could be placed. Try different words with more overlapping letters."
            )
        
        # Assign numbers to word placements
        numbered_placements = []
        number = 1
        
        # Sort placements by row, then column to assign numbers consistently
        sorted_placements = sorted(crossword.word_placements, 
                                 key=lambda p: (p.start_row, p.start_col))
        
        # Assign numbers to starting positions
        position_numbers = {}
        for placement in sorted_placements:
            pos_key = (placement.start_row, placement.start_col)
            if pos_key not in position_numbers:
                position_numbers[pos_key] = number
                number += 1
        
        # Create response with numbered placements
        for placement in crossword.word_placements:
            pos_key = (placement.start_row, placement.start_col)
            numbered_placements.append(WordPlacementResponse(
                word=placement.word,
                start_row=placement.start_row,
                start_col=placement.start_col,
                direction=placement.direction.value,
                number=position_numbers[pos_key]
            ))
        
        return CrosswordResponse(
            grid=crossword.grid,
            width=crossword.width,
            height=crossword.height,
            word_placements=numbered_placements,
            success=True,
            message=f"Successfully generated crossword with {len(crossword.word_placements)} words"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@app.post("/generate-from-topic", response_model=TopicWordsResponse)
async def generate_words_from_topic(request: TopicRequest):
    try:
        # Validate input
        if not request.topic or not request.topic.strip():
            raise HTTPException(
                status_code=400,
                detail="Please provide a topic"
            )
        
        topic = request.topic.strip()
        
        # Generate words and clues using LLM service
        word_clue_data = await LLMService.generate_words_and_clues_from_topic(topic)
        
        # Extract words and create clue mapping
        words = [item['word'] for item in word_clue_data]
        clue_mapping = {item['word']: item['clue'] for item in word_clue_data}
        
        # Log the generated response for debugging
        print(f"📝 Generated {len(words)} words for topic '{topic}': {words}")
        print(f"🧩 Sample clues: {dict(list(clue_mapping.items())[:3])}")
        
        # Generate unique ID for this crossword session
        crossword_id = str(uuid.uuid4())
        
        # Store clue data for later retrieval
        clue_storage[crossword_id] = clue_mapping
        
        response = TopicWordsResponse(
            words=words,
            topic=topic,
            success=True,
            message=f"Successfully generated {len(words)} words for topic '{topic}'",
            crossword_id=crossword_id
        )
        
        # Log the API response being sent to frontend
        print(f"🚀 API Response for topic '{topic}': {response.model_dump()}")
        
        return response
        
    except Exception as e:
        print(f"Error generating words for topic '{request.topic}': {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate words for topic: {str(e)}"
        )

@app.get("/clues/{crossword_id}", response_model=CluesResponse)
async def get_clues(crossword_id: str):
    try:
        if crossword_id not in clue_storage:
            raise HTTPException(
                status_code=404,
                detail=f"Crossword ID '{crossword_id}' not found. Clues may have expired."
            )
        
        clues = clue_storage[crossword_id]
        
        return CluesResponse(
            clues=clues,
            crossword_id=crossword_id,
            success=True,
            message=f"Retrieved {len(clues)} clues for crossword"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error retrieving clues for crossword '{crossword_id}': {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve clues: {str(e)}"
        )

@app.get("/daily")
async def get_daily_crossword(date: Optional[str] = None):
    """Generate daily crossword for a specific date (format: YYYY-MM-DD)"""
    try:
        if not date:
            date = datetime.now(ZoneInfo("America/New_York")).strftime("%Y-%m-%d")
        
        theme = get_daily_theme(date)
        topic = theme["topic"]
        
        # Generate words and clues from topic
        word_clue_data = await LLMService.generate_words_and_clues_from_topic(topic)
        words = [item['word'].upper() for item in word_clue_data]
        clue_mapping = {item['word'].upper(): item['clue'] for item in word_clue_data}
        
        # Generate crossword
        generator = CrosswordGenerator(words, grid_size=15)
        crossword = generator.generate_crossword()
        
        if len(crossword.word_placements) < 2:
            raise HTTPException(
                status_code=500,
                detail="Could not generate valid crossword"
            )
        
        # Convert to our format
        # Create grid with clue IDs (like "1A", "2D")
        grid_size = crossword.width
        grid = [['X' for _ in range(grid_size)] for _ in range(grid_size)]
        positions = {}
        clues = {}
        
        # Assign numbers to starting positions
        sorted_placements = sorted(crossword.word_placements, 
                                 key=lambda p: (p.start_row, p.start_col))
        position_numbers = {}
        number = 1
        for placement in sorted_placements:
            pos_key = (placement.start_row, placement.start_col)
            if pos_key not in position_numbers:
                position_numbers[pos_key] = number
                number += 1
        
        # First pass: assign clue IDs to starting positions
        clue_id_map = {}  # maps (start_row, start_col, direction) to clue_id
        for placement in crossword.word_placements:
            pos_key = (placement.start_row, placement.start_col)
            clue_num = position_numbers[pos_key]
            direction_code = "A" if placement.direction == Direction.HORIZONTAL else "D"
            clue_id = f"{clue_num}{direction_code}"
            clue_id_map[(placement.start_row, placement.start_col, placement.direction)] = clue_id
        
        # Second pass: fill grid with clue IDs and build positions/clues/answers
        # For intersections, store both clue IDs separated by "/"
        answers = {}  # Store correct answers for this puzzle
        
        for placement in crossword.word_placements:
            clue_id = clue_id_map[(placement.start_row, placement.start_col, placement.direction)]
            
            # Place clue ID in all cells of this word
            for i in range(len(placement.word)):
                if placement.direction == Direction.HORIZONTAL:
                    row, col = placement.start_row, placement.start_col + i
                else:
                    row, col = placement.start_row + i, placement.start_col
                
                # Handle intersections by storing both clue IDs
                if grid[row][col] == 'X':
                    grid[row][col] = clue_id
                elif grid[row][col] != clue_id:
                    # This is an intersection - store both IDs
                    existing = grid[row][col]
                    # Make sure we don't duplicate
                    if '/' not in existing:
                        grid[row][col] = f"{existing}/{clue_id}"
            
            print(f"📍 Word {clue_id}: {placement.word} at ({placement.start_row},{placement.start_col}) {placement.direction.value}")
            
            # Store position (only once per clue_id)
            if clue_id not in positions:
                positions[clue_id] = {
                    "row": placement.start_row,
                    "col": placement.start_col,
                    "direction": placement.direction.value,
                    "length": len(placement.word)
                }
            
            # Store clue (only once per clue_id)
            if clue_id not in clues:
                word_upper = placement.word.upper()
                clue_text = clue_mapping.get(word_upper, f"{theme['topic']}-related term")
                clues[clue_id] = {
                    "clue": clue_text,
                    "length": len(placement.word)
                }
            
            # Store answer (only once per clue_id)
            if clue_id not in answers:
                answers[clue_id] = placement.word.upper()
        
        # Store answers for this date
        daily_answers[date] = answers
        
        return {
            "date": date,
            "template": {
                "grid": grid,
                "positions": positions
            },
            "clues": clues,
            "theme": theme
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating daily crossword: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate daily crossword: {str(e)}"
        )

@app.post("/check")
async def check_answers(request: dict):
    """Check user answers against the correct answers for a given date"""
    try:
        date = request.get("date")
        user_answers = request.get("answers", {})
        
        if not date:
            raise HTTPException(status_code=400, detail="Date is required")
        
        # Get correct answers for this date
        correct_answers = daily_answers.get(date)
        
        if not correct_answers:
            raise HTTPException(
                status_code=404, 
                detail=f"No puzzle found for date {date}. Generate it first by calling /daily"
            )
        
        # Check each answer
        results = {}
        for clue_id, user_answer in user_answers.items():
            correct = correct_answers.get(clue_id, "")
            # Case-insensitive comparison, strip whitespace
            is_correct = user_answer.strip().upper() == correct.strip().upper()
            results[clue_id] = {
                "correct": is_correct,
                "answer": correct,
                "length": len(correct)
            }
        
        # Calculate score
        total = len(correct_answers)
        correct_count = sum(1 for r in results.values() if r["correct"])
        
        return {
            "results": results,
            "score": {
                "correct": correct_count,
                "total": total,
                "percentage": round((correct_count / total * 100) if total > 0 else 0, 1)
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error checking answers: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to check answers: {str(e)}"
        )

@app.get("/reveal")
async def reveal_answers(date: Optional[str] = None):
    """Reveal all correct answers for a given date"""
    try:
        if not date:
            date = datetime.now(ZoneInfo("America/New_York")).strftime("%Y-%m-%d")
        
        # Get correct answers for this date
        correct_answers = daily_answers.get(date)
        
        if not correct_answers:
            raise HTTPException(
                status_code=404,
                detail=f"No puzzle found for date {date}. Generate it first by calling /daily"
            )
        
        return {
            "date": date,
            "answers": correct_answers
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error revealing answers: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reveal answers: {str(e)}"
        )

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "crossword-generator"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)