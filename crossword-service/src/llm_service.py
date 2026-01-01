import os
import httpx
import csv
import io
from typing import List, Optional, Dict, Tuple
import json

class LLMService:
    
    @staticmethod
    def get_config():
        return {
            'provider': os.getenv('LLM_PROVIDER', 'mock'),
            'openai_key': os.getenv('OPENAI_API_KEY'),
            'anthropic_key': os.getenv('ANTHROPIC_API_KEY'),
            'ollama_url': os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
        }
    
    @staticmethod
    def create_prompt(topic: str) -> str:
        return f"""You are helping create a crossword puzzle. Generate exactly 30 words with clues related to the topic "{topic}".

Requirements:
- Words should be 3-15 letters long
- Use common English words that most people would know
- Choose words with good crossword potential (mix of vowels and consonants)
- Avoid proper nouns, acronyms, or very technical terms
- Create concise, clear clues for each word (10-50 characters)
- Return ONLY in CSV format: WORD,CLUE
- No explanations, headers, or extra text

Topic: {topic}

Example Input: "Basketball"
Example Output:
BASKETBALL,Sport played with a ball and hoop
PLAYER,Person on the team
COURT,Playing surface
HOOP,Target for scoring
DUNK,Forceful shot from above
SCORE,Points earned in game
TEAM,Group of players
COACH,Team leader and strategist

Now generate 30 word-clue pairs for the topic: "{topic}\""""

    @staticmethod
    async def generate_words_from_topic(topic: str) -> List[str]:
        """Legacy method for backwards compatibility - returns only words"""
        word_clue_data = await LLMService.generate_words_and_clues_from_topic(topic)
        return [item['word'] for item in word_clue_data]
    
    @staticmethod
    async def generate_words_and_clues_from_topic(topic: str) -> List[Dict[str, str]]:
        """New method that returns both words and clues"""
        config = LLMService.get_config()
        print(f"🔧 LLM_PROVIDER: {config['provider']}")
        
        try:
            if config['provider'] == 'openai' and config['openai_key']:
                print(f"🚀 Using OpenAI for topic: {topic}")
                return await LLMService._call_openai(topic, config)
            elif config['provider'] == 'anthropic' and config['anthropic_key']:
                print(f"🚀 Using Anthropic for topic: {topic}")
                return await LLMService._call_anthropic(topic, config)
            elif config['provider'] == 'ollama':
                print(f"🚀 Using Ollama for topic: {topic}")
                return await LLMService._call_ollama(topic, config)
            else:
                print(f"⚠️  No valid LLM provider configured. Provider: {config['provider']}, Has API keys: OpenAI={bool(config['openai_key'])}, Anthropic={bool(config['anthropic_key'])}")
                return LLMService._get_mock_word_clues(topic)
        except Exception as e:
            print(f"❌ LLM call failed: {e}")
            print(f"Provider: {config['provider']}")
            print(f"API key present: {bool(config.get('openai_key' if config['provider'] == 'openai' else 'anthropic_key'))}")
            print("Falling back to mock")
            return LLMService._get_mock_word_clues(topic)
    
    @staticmethod
    async def _call_openai(topic: str, config: dict) -> List[Dict[str, str]]:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                'https://api.openai.com/v1/chat/completions',
                headers={
                    'Authorization': f"Bearer {config['openai_key']}",
                    'Content-Type': 'application/json'
                },
                json={
                    'model': 'gpt-3.5-turbo',
                    'messages': [{'role': 'user', 'content': LLMService.create_prompt(topic)}],
                    'max_tokens': 1000,
                    'temperature': 0.7
                },
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            content = data['choices'][0]['message']['content']
            return LLMService._parse_csv_content(content)
    
    @staticmethod
    async def _call_anthropic(topic: str, config: dict) -> List[Dict[str, str]]:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                'https://api.anthropic.com/v1/messages',
                headers={
                    'x-api-key': config['anthropic_key'],
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01'
                },
                json={
                    'model': 'claude-3-haiku-20240307',
                    'max_tokens': 1000,
                    'messages': [{'role': 'user', 'content': LLMService.create_prompt(topic)}]
                },
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            content = data['content'][0]['text']
            return LLMService._parse_csv_content(content)
    
    @staticmethod
    async def _call_ollama(topic: str, config: dict) -> List[Dict[str, str]]:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{config['ollama_url']}/api/generate",
                json={
                    'model': 'llama2',
                    'prompt': LLMService.create_prompt(topic),
                    'stream': False
                },
                timeout=60.0
            )
            response.raise_for_status()
            data = response.json()
            content = data['response']
            return LLMService._parse_csv_content(content)
    
    @staticmethod
    def _parse_words(content: str) -> List[str]:
        # Find line with comma-separated words
        lines = content.split('\n')
        word_line = ''
        
        for line in lines:
            if ',' in line and len(line.split(',')) > 10:
                word_line = line.strip()
                break
        
        if not word_line:
            # Try to extract from entire content
            import re
            matches = re.findall(r'[A-Z]{3,15}', content)
            if matches and len(matches) > 10:
                word_line = ','.join(matches[:30])
        
        if not word_line:
            raise ValueError("Could not parse words from LLM response")
        
        # Parse and validate
        words = [w.strip().upper() for w in word_line.split(',')]
        words = [w for w in words if w.isalpha() and 3 <= len(w) <= 15]
        
        if len(words) < 10:
            raise ValueError(f"Too few valid words: {len(words)}")
        
        return words[:30]
    
    @staticmethod
    def _parse_csv_content(content: str) -> List[Dict[str, str]]:
        """Parse CSV content from LLM response and return word-clue pairs"""
        try:
            # Clean the content - remove any markdown, explanations, etc.
            lines = content.strip().split('\n')
            csv_lines = []
            
            for line in lines:
                line = line.strip()
                # Skip empty lines, markdown, or explanatory text
                if not line or line.startswith('#') or line.startswith('```') or line.lower().startswith('here'):
                    continue
                # Look for lines with comma separation
                if ',' in line and not line.lower().startswith('word,clue'):
                    csv_lines.append(line)
            
            if not csv_lines:
                raise ValueError("No CSV content found in LLM response")
            
            # Parse CSV data
            word_clue_pairs = []
            for line in csv_lines:
                try:
                    # Use CSV reader to handle quoted content properly
                    csv_reader = csv.reader([line])
                    row = next(csv_reader)
                    
                    if len(row) >= 2:
                        word = row[0].strip().upper()
                        clue = row[1].strip()
                        
                        # Validate word
                        if word.isalpha() and 3 <= len(word) <= 15:
                            word_clue_pairs.append({
                                'word': word,
                                'clue': clue
                            })
                except (csv.Error, ValueError):
                    continue
            
            if len(word_clue_pairs) < 10:
                raise ValueError(f"Too few valid word-clue pairs: {len(word_clue_pairs)}")
            
            return word_clue_pairs[:30]
            
        except Exception as e:
            print(f"Error parsing CSV content: {e}")
            raise ValueError(f"Could not parse CSV content: {e}")
    
    @staticmethod
    def _get_mock_words(topic: str) -> List[str]:
        topic_lower = topic.lower()
        
        mock_data = {
            'pixar': ['WOODY', 'BUZZ', 'TOY', 'STORY', 'MONSTER', 'SULLIVAN', 'MIKE', 'INCREDIBLES', 'DASH', 'VIOLET', 'ELASTIGIRL', 'FROZONE', 'CARS', 'LIGHTNING', 'MATER', 'NEMO', 'DORY', 'MARLIN', 'RATATOUILLE', 'REMY', 'LINGUINI', 'WALL', 'EVE', 'AUTO', 'UP', 'CARL', 'RUSSELL', 'DUG', 'ELLIE', 'BRAVE'],
            'pixar characters': ['WOODY', 'BUZZ', 'TOY', 'STORY', 'MONSTER', 'SULLIVAN', 'MIKE', 'INCREDIBLES', 'DASH', 'VIOLET', 'ELASTIGIRL', 'FROZONE', 'CARS', 'LIGHTNING', 'MATER', 'NEMO', 'DORY', 'MARLIN', 'RATATOUILLE', 'REMY', 'LINGUINI', 'WALL', 'EVE', 'AUTO', 'UP', 'CARL', 'RUSSELL', 'DUG', 'ELLIE', 'BRAVE'],
            'the office': ['DWIGHT', 'JIM', 'PAM', 'MICHAEL', 'ANGELA', 'KEVIN', 'OSCAR', 'STANLEY', 'PHYLLIS', 'CREED', 'MEREDITH', 'KELLY', 'RYAN', 'TOBY', 'ERIN', 'HOLLY', 'SCRANTON', 'DUNDIES', 'BEARS', 'BEETS', 'BATTLESTAR', 'PAPER', 'SALES', 'MANAGER', 'RECEPTIONIST', 'ACCOUNTING', 'WAREHOUSE', 'ANNEX', 'CONFERENCE', 'PARTY'],
            'basketball': ['BASKETBALL', 'PLAYER', 'COURT', 'HOOP', 'DUNK', 'SCORE', 'TEAM', 'COACH', 'REFEREE', 'FOUL', 'TIMEOUT', 'QUARTER', 'POINT', 'GUARD', 'FORWARD', 'CENTER', 'REBOUND', 'ASSIST', 'STEAL', 'BLOCK', 'SHOT', 'LAYUP', 'JERSEY', 'ARENA', 'PLAYOFFS', 'CHAMPIONSHIP', 'LEAGUE', 'DRAFT', 'ROOKIE', 'VETERAN']
        }
        
        # Try exact match
        if topic_lower in mock_data:
            return mock_data[topic_lower]
        
        # Try partial match
        for key, words in mock_data.items():
            if key in topic_lower or topic_lower in key:
                return words
        
        # Generic fallback
        return ['WORD', 'LETTER', 'PUZZLE', 'GAME', 'PLAY', 'FUN', 'BRAIN', 'THINK', 'SOLVE', 'CROSS', 'DOWN', 'ACROSS', 'CLUE', 'ANSWER', 'GRID', 'BOX', 'LINE', 'SQUARE', 'BLACK', 'WHITE', 'NUMBER', 'COUNT', 'TOTAL', 'SUM', 'ADD', 'MAKE', 'CREATE', 'BUILD', 'FORM', 'SHAPE']
    
    @staticmethod
    def _get_mock_word_clues(topic: str) -> List[Dict[str, str]]:
        """Return mock word-clue pairs for various topics"""
        print(f"⚠️  Using MOCK data for topic '{topic}' - LLM_PROVIDER is set to 'mock' or LLM call failed")
        topic_lower = topic.lower()
        
        mock_data = {
            'pixar': [
                {'word': 'WOODY', 'clue': 'Cowboy toy in Toy Story'},
                {'word': 'BUZZ', 'clue': 'Space ranger action figure'},
                {'word': 'NEMO', 'clue': 'Lost clownfish'},
                {'word': 'DORY', 'clue': 'Forgetful blue fish'},
                {'word': 'SULLIVAN', 'clue': 'Blue monster with horns'},
                {'word': 'MIKE', 'clue': 'One-eyed green monster'},
                {'word': 'INCREDIBLES', 'clue': 'Superhero family'},
                {'word': 'DASH', 'clue': 'Super-fast boy'},
                {'word': 'VIOLET', 'clue': 'Invisible girl'},
                {'word': 'FROZONE', 'clue': 'Ice-powered superhero'},
                {'word': 'LIGHTNING', 'clue': 'Race car McQueen'},
                {'word': 'MATER', 'clue': 'Rusty tow truck'},
                {'word': 'REMY', 'clue': 'Cooking rat'},
                {'word': 'WALL', 'clue': 'Robot who cleans Earth'},
                {'word': 'EVE', 'clue': 'Sleek white robot'},
                {'word': 'CARL', 'clue': 'Old man with balloons'},
                {'word': 'RUSSELL', 'clue': 'Wilderness Explorer scout'},
                {'word': 'DUG', 'clue': 'Talking dog who loves squirrels'},
                {'word': 'ELLIE', 'clue': 'Carls beloved wife'},
                {'word': 'BRAVE', 'clue': 'Scottish princess tale'},
                {'word': 'MARLIN', 'clue': 'Nemos worried father'},
                {'word': 'RATATOUILLE', 'clue': 'French dish and movie title'},
                {'word': 'MONSTER', 'clue': 'Scary creature from closet'},
                {'word': 'TOY', 'clue': 'Plaything that comes alive'},
                {'word': 'STORY', 'clue': 'Tale or narrative'},
                {'word': 'CARS', 'clue': 'Racing vehicles movie'},
                {'word': 'UP', 'clue': 'Movie about flying house'},
                {'word': 'AUTO', 'clue': 'Self-steering spaceship captain'},
                {'word': 'ELASTIGIRL', 'clue': 'Stretchy superhero mom'},
                {'word': 'LINGUINI', 'clue': 'Clumsy chef in Paris'}
            ],
            'pixar characters': [
                {'word': 'WOODY', 'clue': 'Cowboy toy in Toy Story'},
                {'word': 'BUZZ', 'clue': 'Space ranger action figure'},
                {'word': 'NEMO', 'clue': 'Lost clownfish'},
                {'word': 'DORY', 'clue': 'Forgetful blue fish'},
                {'word': 'SULLIVAN', 'clue': 'Blue monster with horns'},
                {'word': 'MIKE', 'clue': 'One-eyed green monster'},
                {'word': 'INCREDIBLES', 'clue': 'Superhero family'},
                {'word': 'DASH', 'clue': 'Super-fast boy'},
                {'word': 'VIOLET', 'clue': 'Invisible girl'},
                {'word': 'FROZONE', 'clue': 'Ice-powered superhero'},
                {'word': 'LIGHTNING', 'clue': 'Race car McQueen'},
                {'word': 'MATER', 'clue': 'Rusty tow truck'},
                {'word': 'REMY', 'clue': 'Cooking rat'},
                {'word': 'WALL', 'clue': 'Robot who cleans Earth'},
                {'word': 'EVE', 'clue': 'Sleek white robot'},
                {'word': 'CARL', 'clue': 'Old man with balloons'},
                {'word': 'RUSSELL', 'clue': 'Wilderness Explorer scout'},
                {'word': 'DUG', 'clue': 'Talking dog who loves squirrels'},
                {'word': 'ELLIE', 'clue': 'Carls beloved wife'},
                {'word': 'BRAVE', 'clue': 'Scottish princess tale'},
                {'word': 'MARLIN', 'clue': 'Nemos worried father'},
                {'word': 'RATATOUILLE', 'clue': 'French dish and movie title'},
                {'word': 'MONSTER', 'clue': 'Scary creature from closet'},
                {'word': 'TOY', 'clue': 'Plaything that comes alive'},
                {'word': 'STORY', 'clue': 'Tale or narrative'},
                {'word': 'CARS', 'clue': 'Racing vehicles movie'},
                {'word': 'UP', 'clue': 'Movie about flying house'},
                {'word': 'AUTO', 'clue': 'Self-steering spaceship captain'},
                {'word': 'ELASTIGIRL', 'clue': 'Stretchy superhero mom'},
                {'word': 'LINGUINI', 'clue': 'Clumsy chef in Paris'}
            ],
            'basketball': [
                {'word': 'BASKETBALL', 'clue': 'Sport with hoops and dribbling'},
                {'word': 'PLAYER', 'clue': 'Team member on court'},
                {'word': 'COURT', 'clue': 'Playing surface'},
                {'word': 'HOOP', 'clue': 'Target for scoring'},
                {'word': 'DUNK', 'clue': 'Forceful shot from above'},
                {'word': 'SCORE', 'clue': 'Points earned'},
                {'word': 'TEAM', 'clue': 'Group of players'},
                {'word': 'COACH', 'clue': 'Team strategist'},
                {'word': 'REFEREE', 'clue': 'Game official'},
                {'word': 'FOUL', 'clue': 'Rule violation'},
                {'word': 'TIMEOUT', 'clue': 'Game pause'},
                {'word': 'QUARTER', 'clue': 'Game period'},
                {'word': 'POINT', 'clue': 'Scoring unit'},
                {'word': 'GUARD', 'clue': 'Backcourt position'},
                {'word': 'FORWARD', 'clue': 'Frontcourt position'},
                {'word': 'CENTER', 'clue': 'Tallest player position'},
                {'word': 'REBOUND', 'clue': 'Retrieving missed shot'},
                {'word': 'ASSIST', 'clue': 'Pass leading to score'},
                {'word': 'STEAL', 'clue': 'Taking ball from opponent'},
                {'word': 'BLOCK', 'clue': 'Stopping opponents shot'},
                {'word': 'SHOT', 'clue': 'Attempt to score'},
                {'word': 'LAYUP', 'clue': 'Close-range shot'},
                {'word': 'JERSEY', 'clue': 'Player uniform top'},
                {'word': 'ARENA', 'clue': 'Large basketball venue'},
                {'word': 'PLAYOFFS', 'clue': 'Post-season games'},
                {'word': 'CHAMPIONSHIP', 'clue': 'Final tournament'},
                {'word': 'LEAGUE', 'clue': 'Organization of teams'},
                {'word': 'DRAFT', 'clue': 'Player selection process'},
                {'word': 'ROOKIE', 'clue': 'First-year player'},
                {'word': 'VETERAN', 'clue': 'Experienced player'}
            ]
        }
        
        # Try exact match
        if topic_lower in mock_data:
            return mock_data[topic_lower]
        
        # Try partial match
        for key, word_clues in mock_data.items():
            if key in topic_lower or topic_lower in key:
                return word_clues
        
        # Generic fallback
        return [
            {'word': 'WORD', 'clue': 'Unit of language'},
            {'word': 'LETTER', 'clue': 'Character in alphabet'},
            {'word': 'PUZZLE', 'clue': 'Brain teaser game'},
            {'word': 'GAME', 'clue': 'Recreational activity'},
            {'word': 'PLAY', 'clue': 'Engage in activity'},
            {'word': 'FUN', 'clue': 'Enjoyment or amusement'},
            {'word': 'BRAIN', 'clue': 'Thinking organ'},
            {'word': 'THINK', 'clue': 'Use mental power'},
            {'word': 'SOLVE', 'clue': 'Find the answer'},
            {'word': 'CROSS', 'clue': 'Intersect or traverse'},
            {'word': 'DOWN', 'clue': 'Vertical direction'},
            {'word': 'ACROSS', 'clue': 'Horizontal direction'},
            {'word': 'CLUE', 'clue': 'Hint or indication'},
            {'word': 'ANSWER', 'clue': 'Solution or response'},
            {'word': 'GRID', 'clue': 'Network of lines'},
            {'word': 'BOX', 'clue': 'Square container'},
            {'word': 'LINE', 'clue': 'Straight mark'},
            {'word': 'SQUARE', 'clue': 'Four-sided shape'},
            {'word': 'BLACK', 'clue': 'Darkest color'},
            {'word': 'WHITE', 'clue': 'Lightest color'},
            {'word': 'NUMBER', 'clue': 'Numerical value'},
            {'word': 'COUNT', 'clue': 'Calculate total'},
            {'word': 'TOTAL', 'clue': 'Complete sum'},
            {'word': 'SUM', 'clue': 'Addition result'},
            {'word': 'ADD', 'clue': 'Combine numbers'},
            {'word': 'MAKE', 'clue': 'Create or produce'},
            {'word': 'CREATE', 'clue': 'Bring into existence'},
            {'word': 'BUILD', 'clue': 'Construct or assemble'},
            {'word': 'FORM', 'clue': 'Shape or structure'},
            {'word': 'SHAPE', 'clue': 'External form'}
        ]