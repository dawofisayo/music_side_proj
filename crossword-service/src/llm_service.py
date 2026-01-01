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
        return f"""You are creating crossword clues in the style of The New York Times crosswords. Generate exactly 30 words with clues related to the topic "{topic}".

Clue Style Guidelines (NYT-style):
- Be CLEVER and WITTY, not obvious or dictionary-like
- Use WORDPLAY, PUNS, and DOUBLE MEANINGS whenever possible
- Create INDIRECT references rather than direct definitions
- Include CULTURAL REFERENCES, idioms, or common phrases
- Make clues feel like a DELIGHTFUL PUZZLE to solve
- Use HUMOR and PLAYFULNESS when appropriate
- Avoid bland descriptions like "A person who..." or "Something that..."
- Think: "What's a clever way to describe this without saying it directly?"

Requirements:
- Words should be 3-15 letters long
- Use common English words that most people would know
- Choose words with good crossword potential (mix of vowels and consonants)
- Avoid proper nouns, acronyms, or very technical terms (unless the topic specifically calls for them)
- Clue length: 15-70 characters
- Return ONLY in CSV format: WORD,CLUE
- No explanations, headers, or extra text

Topic: {topic}

Example Input: "Basketball"
Example Output:
BASKETBALL,Game that goes round and round
PLAYER,One who might score off the bench
COURT,Where you might be charged with traveling
HOOP,Dreams of making a net profit
DUNK,What happens when talent meets height
SCORE,What winners always have
TEAM,Strength in numbers, literally
COACH,Has a game plan for everything
REFEREE,Wears stripes and makes calls
FOUL,Play that's not so fair
TIMEOUT,When the clock stops ticking
QUARTER,One fourth of the action
REBOUND,Second chance after rejection
ASSIST,Help that counts on the stat sheet
BLOCK,Rejection at its finest

Now generate 30 word-clue pairs for the topic: "{topic}". Make them clever, witty, and NYT-style creative!\""""

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
                {'word': 'WOODY', 'clue': 'Has a string attached'},
                {'word': 'BUZZ', 'clue': 'Flying to infinity and beyond'},
                {'word': 'NEMO', 'clue': 'Little fish, big adventure'},
                {'word': 'DORY', 'clue': 'Has trouble remembering this clue'},
                {'word': 'SULLIVAN', 'clue': 'Big blue and not so scary'},
                {'word': 'MIKE', 'clue': 'One eye, all heart'},
                {'word': 'INCREDIBLES', 'clue': 'Family that\'s super'},
                {'word': 'DASH', 'clue': 'Speed of light, literally'},
                {'word': 'VIOLET', 'clue': 'Shy girl who fades away'},
                {'word': 'FROZONE', 'clue': 'Ice cold, superhero style'},
                {'word': 'LIGHTNING', 'clue': 'Ka-chow, says this racer'},
                {'word': 'MATER', 'clue': 'Best friend, a bit rusty'},
                {'word': 'REMY', 'clue': 'Rat with culinary dreams'},
                {'word': 'WALL', 'clue': 'Robot that cleans up Earth'},
                {'word': 'EVE', 'clue': 'White robot on a mission'},
                {'word': 'CARL', 'clue': 'House that floats away'},
                {'word': 'RUSSELL', 'clue': 'Wilderness Explorer scout'},
                {'word': 'DUG', 'clue': 'Squirrel!'},
                {'word': 'ELLIE', 'clue': 'Adventure book\'s inspiration'},
                {'word': 'BRAVE', 'clue': 'Scottish princess with a bow'},
                {'word': 'MARLIN', 'clue': 'Overprotective father of the sea'},
                {'word': 'RATATOUILLE', 'clue': 'French dish, animated style'},
                {'word': 'MONSTER', 'clue': 'Scares kids for a living'},
                {'word': 'TOY', 'clue': 'Comes alive when you\'re gone'},
                {'word': 'STORY', 'clue': 'Tale of unlikely friendship'},
                {'word': 'CARS', 'clue': 'Radiator Springs comes alive'},
                {'word': 'UP', 'clue': 'Direction this house goes'},
                {'word': 'AUTO', 'clue': 'Villainous captain on autopilot'},
                {'word': 'ELASTIGIRL', 'clue': 'Mom who can stretch'},
                {'word': 'LINGUINI', 'clue': 'Clumsy chef who needs guidance'}
            ],
            'pixar characters': [
                {'word': 'WOODY', 'clue': 'Has a string attached'},
                {'word': 'BUZZ', 'clue': 'Flying to infinity and beyond'},
                {'word': 'NEMO', 'clue': 'Little fish, big adventure'},
                {'word': 'DORY', 'clue': 'Has trouble remembering this clue'},
                {'word': 'SULLIVAN', 'clue': 'Big blue and not so scary'},
                {'word': 'MIKE', 'clue': 'One eye, all heart'},
                {'word': 'INCREDIBLES', 'clue': 'Family that\'s super'},
                {'word': 'DASH', 'clue': 'Speed of light, literally'},
                {'word': 'VIOLET', 'clue': 'Shy girl who fades away'},
                {'word': 'FROZONE', 'clue': 'Ice cold, superhero style'},
                {'word': 'LIGHTNING', 'clue': 'Ka-chow, says this racer'},
                {'word': 'MATER', 'clue': 'Best friend, a bit rusty'},
                {'word': 'REMY', 'clue': 'Rat with culinary dreams'},
                {'word': 'WALL', 'clue': 'Robot that cleans up Earth'},
                {'word': 'EVE', 'clue': 'White robot on a mission'},
                {'word': 'CARL', 'clue': 'House that floats away'},
                {'word': 'RUSSELL', 'clue': 'Wilderness Explorer scout'},
                {'word': 'DUG', 'clue': 'Squirrel!'},
                {'word': 'ELLIE', 'clue': 'Adventure book\'s inspiration'},
                {'word': 'BRAVE', 'clue': 'Scottish princess with a bow'},
                {'word': 'MARLIN', 'clue': 'Overprotective father of the sea'},
                {'word': 'RATATOUILLE', 'clue': 'French dish, animated style'},
                {'word': 'MONSTER', 'clue': 'Scares kids for a living'},
                {'word': 'TOY', 'clue': 'Comes alive when you\'re gone'},
                {'word': 'STORY', 'clue': 'Tale of unlikely friendship'},
                {'word': 'CARS', 'clue': 'Radiator Springs comes alive'},
                {'word': 'UP', 'clue': 'Direction this house goes'},
                {'word': 'AUTO', 'clue': 'Villainous captain on autopilot'},
                {'word': 'ELASTIGIRL', 'clue': 'Mom who can stretch'},
                {'word': 'LINGUINI', 'clue': 'Clumsy chef who needs guidance'}
            ],
            'basketball': [
                {'word': 'BASKETBALL', 'clue': 'Game that goes round and round'},
                {'word': 'PLAYER', 'clue': 'One who might score off the bench'},
                {'word': 'COURT', 'clue': 'Where you might be charged with traveling'},
                {'word': 'HOOP', 'clue': 'Dreams of making a net profit'},
                {'word': 'DUNK', 'clue': 'What happens when talent meets height'},
                {'word': 'SCORE', 'clue': 'What winners always have'},
                {'word': 'TEAM', 'clue': 'Strength in numbers, literally'},
                {'word': 'COACH', 'clue': 'Has a game plan for everything'},
                {'word': 'REFEREE', 'clue': 'Wears stripes and makes calls'},
                {'word': 'FOUL', 'clue': 'Play that\'s not so fair'},
                {'word': 'TIMEOUT', 'clue': 'When the clock stops ticking'},
                {'word': 'QUARTER', 'clue': 'One fourth of the action'},
                {'word': 'POINT', 'clue': 'What you get for making it count'},
                {'word': 'GUARD', 'clue': 'Backcourt protector'},
                {'word': 'FORWARD', 'clue': 'Moving ahead on the court'},
                {'word': 'CENTER', 'clue': 'Tall order in the middle'},
                {'word': 'REBOUND', 'clue': 'Second chance after rejection'},
                {'word': 'ASSIST', 'clue': 'Help that counts on the stat sheet'},
                {'word': 'STEAL', 'clue': 'Taking what isn\'t yours'},
                {'word': 'BLOCK', 'clue': 'Rejection at its finest'},
                {'word': 'SHOT', 'clue': 'Your moment to shine'},
                {'word': 'LAYUP', 'clue': 'The easiest two points'},
                {'word': 'JERSEY', 'clue': 'What you wear with your number'},
                {'word': 'ARENA', 'clue': 'Where thousands come to watch'},
                {'word': 'PLAYOFFS', 'clue': 'When every game matters'},
                {'word': 'CHAMPIONSHIP', 'clue': 'The ultimate prize'},
                {'word': 'LEAGUE', 'clue': 'Where the best compete'},
                {'word': 'DRAFT', 'clue': 'Where dreams get selected'},
                {'word': 'ROOKIE', 'clue': 'First year in the big time'},
                {'word': 'VETERAN', 'clue': 'Been there, done that'}
            ],
            'daniel caesar': [
                {'word': 'CAESAR', 'clue': 'Ruler of R&B, historically speaking'},
                {'word': 'TORONTO', 'clue': 'The 6ix, to locals'},
                {'word': 'R&B', 'clue': 'Rhythm that gets you in your feelings'},
                {'word': 'ALBUM', 'clue': 'Record collection, singular'},
                {'word': 'SONG', 'clue': 'Three-minute emotion'},
                {'word': 'VOICE', 'clue': 'What makes you stand out in the crowd'},
                {'word': 'LOVE', 'clue': 'All you need, allegedly'},
                {'word': 'HEART', 'clue': 'Where the beat really lives'},
                {'word': 'SOUL', 'clue': 'What you pour into the mic'},
                {'word': 'MELODY', 'clue': 'The part that gets stuck'},
                {'word': 'LYRICS', 'clue': 'Poetry set to a beat'},
                {'word': 'BEAT', 'clue': 'What makes you move involuntarily'},
                {'word': 'PIANO', 'clue': 'Keys to unlocking emotion'},
                {'word': 'GUITAR', 'clue': 'Six strings of heartbreak'},
                {'word': 'STUDIO', 'clue': 'Where raw becomes refined'},
                {'word': 'MICROPHONE', 'clue': 'Voice amplifier'},
                {'word': 'STAGE', 'clue': 'Where dreams perform'},
                {'word': 'CROWD', 'clue': 'Sea of raised phones'},
                {'word': 'TOUR', 'clue': 'Taking the show on the road'},
                {'word': 'FAME', 'clue': 'The price of being known'},
                {'word': 'ARTIST', 'clue': 'One who creates, not just performs'},
                {'word': 'MUSIC', 'clue': 'Universal translator'},
                {'word': 'SOUND', 'clue': 'Waves that move you'},
                {'word': 'RHYTHM', 'clue': 'The pulse you can\'t ignore'},
                {'word': 'HARMONY', 'clue': 'When voices become one'},
                {'word': 'CHORD', 'clue': 'Three notes in harmony'},
                {'word': 'NOTE', 'clue': 'Single tone, infinite possibilities'},
                {'word': 'KEY', 'clue': 'Opens the right door'},
                {'word': 'TONE', 'clue': 'Quality that sets the mood'},
                {'word': 'PITCH', 'clue': 'High or low, but never flat'}
            ],
            'the beatles': [
                {'word': 'BEATLES', 'clue': 'More popular than Jesus, they said'},
                {'word': 'LIVERPOOL', 'clue': 'Where the Fab Four began'},
                {'word': 'JOHN', 'clue': 'One who imagined no possessions'},
                {'word': 'PAUL', 'clue': 'The lefty who kept the band alive'},
                {'word': 'GEORGE', 'clue': 'The quiet one with something to say'},
                {'word': 'RINGO', 'clue': 'Drummer who got by with help'},
                {'word': 'ABBEY', 'clue': 'Road where magic was made'},
                {'word': 'ALBUM', 'clue': 'Record collection, singular'},
                {'word': 'SONG', 'clue': 'What you sing in the car'},
                {'word': 'HIT', 'clue': 'What they had plenty of'},
                {'word': 'ROCK', 'clue': 'What they rolled'},
                {'word': 'POP', 'clue': 'Genre they perfected'},
                {'word': 'BAND', 'clue': 'Four became one'},
                {'word': 'GUITAR', 'clue': 'Six strings, endless possibilities'},
                {'word': 'BASS', 'clue': 'The foundation'},
                {'word': 'DRUMS', 'clue': 'What keeps the time'},
                {'word': 'PIANO', 'clue': 'Keys to Yesterday'},
                {'word': 'LYRICS', 'clue': 'Words that changed everything'},
                {'word': 'MELODY', 'clue': 'The hook that hooks you'},
                {'word': 'BEAT', 'clue': 'What makes you move'},
                {'word': 'LOVE', 'clue': 'All you need, they claimed'},
                {'word': 'YELLOW', 'clue': 'Submarine\'s signature shade'},
                {'word': 'STRAWBERRY', 'clue': 'Fields where nothing is real'},
                {'word': 'PEPPER', 'clue': 'Sgt. Pepper\'s lonely hearts'},
                {'word': 'REVOLVER', 'clue': 'Spins round and round'},
                {'word': 'WHITE', 'clue': 'The album with no name'},
                {'word': 'MAGICAL', 'clue': 'Type of mystery tour'},
                {'word': 'TOUR', 'clue': 'When they came to America'},
                {'word': 'FAME', 'clue': 'What they found on Ed Sullivan'},
                {'word': 'LEGEND', 'clue': 'Status achieved by four lads'}
            ],
            'drake': [
                {'word': 'DRAKE', 'clue': 'Started from the bottom, now he\'s here'},
                {'word': 'TORONTO', 'clue': 'The 6ix, where he reps'},
                {'word': 'RAP', 'clue': 'Rhythm and poetry in motion'},
                {'word': 'HIPHOP', 'clue': 'Culture that raised him'},
                {'word': 'FLOW', 'clue': 'How you ride the beat'},
                {'word': 'BEAT', 'clue': 'The rhythm that moves you'},
                {'word': 'RHYME', 'clue': 'When words sound the same'},
                {'word': 'VERSE', 'clue': 'Where the story gets told'},
                {'word': 'CHORUS', 'clue': 'The part you can\'t forget'},
                {'word': 'ALBUM', 'clue': 'Views from the 6'},
                {'word': 'MIXTAPE', 'clue': 'Unofficial but still fire'},
                {'word': 'TRACK', 'clue': 'Single serving of sound'},
                {'word': 'FEATURE', 'clue': 'Cameo on someone else\'s song'},
                {'word': 'COLLAB', 'clue': 'When two become one'},
                {'word': 'STUDIO', 'clue': 'Where the magic happens'},
                {'word': 'MICROPHONE', 'clue': 'Voice amplifier'},
                {'word': 'STAGE', 'clue': 'Where dreams perform'},
                {'word': 'CROWD', 'clue': 'Sea of raised phones'},
                {'word': 'TOUR', 'clue': 'Taking the show on the road'},
                {'word': 'FAME', 'clue': 'Started from the bottom'},
                {'word': 'WEALTH', 'clue': 'Started from nothing'},
                {'word': 'SUCCESS', 'clue': 'What winning looks like'},
                {'word': 'HIT', 'clue': 'Chart-topper'},
                {'word': 'CHART', 'clue': 'Where numbers tell the story'},
                {'word': 'STREAM', 'clue': 'How music flows now'},
                {'word': 'PLAYLIST', 'clue': 'Curated vibes'},
                {'word': 'SPOTIFY', 'clue': 'Where you press play'},
                {'word': 'APPLE', 'clue': 'Music in your pocket'},
                {'word': 'GRAMMY', 'clue': 'Gold recognition'},
                {'word': 'AWARD', 'clue': 'Trophy for the mantel'}
            ],
            'beyoncé': [
                {'word': 'BEYONCE', 'clue': 'Who runs the world? Girls, she says'},
                {'word': 'HOUSTON', 'clue': 'H-Town, where she\'s from'},
                {'word': 'DESTINY', 'clue': 'What her child group was called'},
                {'word': 'SOLO', 'clue': 'Going it alone after the group'},
                {'word': 'R&B', 'clue': 'Smooth genre she perfected'},
                {'word': 'POP', 'clue': 'Genre that loves her'},
                {'word': 'DANCE', 'clue': 'What she does flawlessly'},
                {'word': 'PERFORM', 'clue': 'What she does best'},
                {'word': 'STAGE', 'clue': 'Her natural habitat'},
                {'word': 'MICROPHONE', 'clue': 'Voice amplifier'},
                {'word': 'VOICE', 'clue': 'Powerful instrument'},
                {'word': 'POWER', 'clue': 'What girls run the world with'},
                {'word': 'QUEEN', 'clue': 'Her royal title'},
                {'word': 'ALBUM', 'clue': 'Visual or Lemonade, for example'},
                {'word': 'SONG', 'clue': 'Three-minute emotion'},
                {'word': 'HIT', 'clue': 'She has plenty'},
                {'word': 'LYRICS', 'clue': 'Words that empower'},
                {'word': 'MELODY', 'clue': 'The part that gets stuck'},
                {'word': 'BEAT', 'clue': 'What makes you move'},
                {'word': 'RHYTHM', 'clue': 'The pulse you can\'t ignore'},
                {'word': 'LOVE', 'clue': 'What\'s on top'},
                {'word': 'HEART', 'clue': 'Where the music lives'},
                {'word': 'SOUL', 'clue': 'What you pour into the mic'},
                {'word': 'FAME', 'clue': 'Price of being Beyoncé'},
                {'word': 'LEGEND', 'clue': 'Status she\'s earned'},
                {'word': 'ICON', 'clue': 'Cultural touchstone'},
                {'word': 'STAR', 'clue': 'Shining at the top'},
                {'word': 'TOUR', 'clue': 'Taking the show on the road'},
                {'word': 'CROWD', 'clue': 'Sea of raised phones'},
                {'word': 'GRAMMY', 'clue': 'Award she\'s won many times'}
            ],
            '90s hip hop': [
                {'word': 'NINETIES', 'clue': 'Decade of baggy everything'},
                {'word': 'HIPHOP', 'clue': 'Culture that changed everything'},
                {'word': 'RAP', 'clue': 'Rhythm and poetry in motion'},
                {'word': 'BEAT', 'clue': 'The rhythm that moves you'},
                {'word': 'FLOW', 'clue': 'How you ride the beat'},
                {'word': 'RHYME', 'clue': 'When words sound the same'},
                {'word': 'VERSE', 'clue': 'Where the story gets told'},
                {'word': 'CHORUS', 'clue': 'The part you can\'t forget'},
                {'word': 'TURNTABLE', 'clue': 'Where records spin'},
                {'word': 'VINYL', 'clue': 'Black gold that spins'},
                {'word': 'SCRATCH', 'clue': 'DJ\'s signature sound'},
                {'word': 'DJ', 'clue': 'Master of the turntables'},
                {'word': 'MC', 'clue': 'Master of ceremonies, microphone controller'},
                {'word': 'PRODUCER', 'clue': 'Beat architect'},
                {'word': 'SAMPLER', 'clue': 'Sound recycler'},
                {'word': 'LOOP', 'clue': 'What goes round and round'},
                {'word': 'BREAK', 'clue': 'Drum solo that became history'},
                {'word': 'BATTLE', 'clue': 'Rap competition, verbal warfare'},
                {'word': 'CIPHER', 'clue': 'Freestyle circle, cypher'},
                {'word': 'FREESTYLE', 'clue': 'Off the dome, no script'},
                {'word': 'LYRICS', 'clue': 'Poetry set to a beat'},
                {'word': 'BARS', 'clue': 'Lines that hit different'},
                {'word': 'PUNCHLINE', 'clue': 'The line that lands'},
                {'word': 'METAPHOR', 'clue': 'Saying it without saying it'},
                {'word': 'WORDPLAY', 'clue': 'Language gymnastics'},
                {'word': 'STREET', 'clue': 'Where it all started'},
                {'word': 'BLOCK', 'clue': 'Your neighborhood'},
                {'word': 'PARTY', 'clue': 'Where the music lives'},
                {'word': 'CLUB', 'clue': 'Nighttime dance spot'},
                {'word': 'BOOMBOX', 'clue': 'Portable sound machine'}
            ],
            '80s rock': [
                {'word': 'EIGHTIES', 'clue': 'Decade of big hair and bigger riffs'},
                {'word': 'ROCK', 'clue': 'What they rolled, what they played'},
                {'word': 'BAND', 'clue': 'Group that rocks together'},
                {'word': 'GUITAR', 'clue': 'Six strings of power'},
                {'word': 'ELECTRIC', 'clue': 'Amplified to eleven'},
                {'word': 'AMPLIFIER', 'clue': 'Sound booster to the max'},
                {'word': 'DRUMS', 'clue': 'What keeps the beat'},
                {'word': 'BASS', 'clue': 'The foundation, low and deep'},
                {'word': 'VOCALS', 'clue': 'The voice that soars'},
                {'word': 'SOLO', 'clue': 'Guitar showcase moment'},
                {'word': 'RIFF', 'clue': 'Repeated phrase that hooks you'},
                {'word': 'CHORD', 'clue': 'Three notes in harmony'},
                {'word': 'POWER', 'clue': 'Type of ballad that rocks'},
                {'word': 'BALLAD', 'clue': 'Slow burn of emotion'},
                {'word': 'ANTHEM', 'clue': 'Crowd singalong favorite'},
                {'word': 'ALBUM', 'clue': 'Record collection, singular'},
                {'word': 'CASSETTE', 'clue': 'Tape format of the era'},
                {'word': 'VINYL', 'clue': 'Black gold that spins'},
                {'word': 'RADIO', 'clue': 'Airwaves of sound'},
                {'word': 'MTV', 'clue': 'Music television, changed everything'},
                {'word': 'VIDEO', 'clue': 'Visual song, killed the radio star'},
                {'word': 'TOUR', 'clue': 'Taking the show on the road'},
                {'word': 'STAGE', 'clue': 'Where dreams perform'},
                {'word': 'ARENA', 'clue': 'Where thousands come to rock'},
                {'word': 'CROWD', 'clue': 'Sea of raised lighters'},
                {'word': 'MOSH', 'clue': 'Pit activity, not for the faint'},
                {'word': 'HEADBANG', 'clue': 'Rock movement, headbanger style'},
                {'word': 'LEGEND', 'clue': 'Status they achieved'},
                {'word': 'ICON', 'clue': 'Cultural touchstone'},
                {'word': 'CLASSIC', 'clue': 'Timeless, never gets old'}
            ],
            'classic rock': [
                {'word': 'ROCK', 'clue': 'What they rolled, what they played'},
                {'word': 'CLASSIC', 'clue': 'Timeless, never gets old'},
                {'word': 'BAND', 'clue': 'Group that rocks together'},
                {'word': 'GUITAR', 'clue': 'Six strings of power'},
                {'word': 'ELECTRIC', 'clue': 'Amplified to eleven'},
                {'word': 'ACOUSTIC', 'clue': 'Unplugged, raw and real'},
                {'word': 'DRUMS', 'clue': 'What keeps the beat'},
                {'word': 'BASS', 'clue': 'The foundation, low and deep'},
                {'word': 'VOCALS', 'clue': 'The voice that soars'},
                {'word': 'SOLO', 'clue': 'Guitar showcase moment'},
                {'word': 'RIFF', 'clue': 'Repeated phrase that hooks you'},
                {'word': 'CHORD', 'clue': 'Three notes in harmony'},
                {'word': 'ALBUM', 'clue': 'Record collection, singular'},
                {'word': 'VINYL', 'clue': 'Black gold that spins'},
                {'word': 'RECORD', 'clue': 'Physical music, vintage style'},
                {'word': 'TURNTABLE', 'clue': 'Where records spin'},
                {'word': 'RADIO', 'clue': 'Airwaves of sound'},
                {'word': 'STATION', 'clue': 'Tune in here'},
                {'word': 'TOUR', 'clue': 'Taking the show on the road'},
                {'word': 'STAGE', 'clue': 'Where dreams perform'},
                {'word': 'ARENA', 'clue': 'Where thousands come to rock'},
                {'word': 'STADIUM', 'clue': 'Massive venue, maximum impact'},
                {'word': 'CROWD', 'clue': 'Sea of raised lighters'},
                {'word': 'FANS', 'clue': 'Devoted followers, loyal to the end'},
                {'word': 'LEGEND', 'clue': 'Status achieved by the greats'},
                {'word': 'ICON', 'clue': 'Cultural touchstone'},
                {'word': 'TIMELESS', 'clue': 'Never goes out of style'},
                {'word': 'EPIC', 'clue': 'Grand and impressive, larger than life'},
                {'word': 'ANTHEM', 'clue': 'Crowd singalong favorite'},
                {'word': 'MASTERPIECE', 'clue': 'Work of art, pure genius'}
            ],
            'pop music': [
                {'word': 'POP', 'clue': 'Genre that bubbles up'},
                {'word': 'HIT', 'clue': 'What everyone\'s playing'},
                {'word': 'CHART', 'clue': 'Where numbers tell the story'},
                {'word': 'TOP', 'clue': 'Number one, the peak'},
                {'word': 'SONG', 'clue': 'Three-minute emotion'},
                {'word': 'ALBUM', 'clue': 'Record collection, singular'},
                {'word': 'SINGLE', 'clue': 'One track, maximum impact'},
                {'word': 'RADIO', 'clue': 'Airwaves of sound'},
                {'word': 'STATION', 'clue': 'Tune in here'},
                {'word': 'STREAM', 'clue': 'How music flows now'},
                {'word': 'PLAYLIST', 'clue': 'Curated vibes'},
                {'word': 'SPOTIFY', 'clue': 'Where you press play'},
                {'word': 'APPLE', 'clue': 'Music in your pocket'},
                {'word': 'DANCE', 'clue': 'Move to the rhythm'},
                {'word': 'BEAT', 'clue': 'What makes you move'},
                {'word': 'MELODY', 'clue': 'The part that gets stuck'},
                {'word': 'CATCHY', 'clue': 'Earworm material'},
                {'word': 'HOOK', 'clue': 'What reels you in'},
                {'word': 'CHORUS', 'clue': 'The part you can\'t forget'},
                {'word': 'VERSE', 'clue': 'Where the story gets told'},
                {'word': 'BRIDGE', 'clue': 'Connecting the dots'},
                {'word': 'LYRICS', 'clue': 'Words that tell the story'},
                {'word': 'VOICE', 'clue': 'What makes you stand out'},
                {'word': 'STAR', 'clue': 'Shining at the top'},
                {'word': 'FAME', 'clue': 'Price of being known'},
                {'word': 'STAGE', 'clue': 'Where dreams perform'},
                {'word': 'TOUR', 'clue': 'Taking the show on the road'},
                {'word': 'CROWD', 'clue': 'Sea of raised phones'},
                {'word': 'FANS', 'clue': 'Devoted followers'},
                {'word': 'GRAMMY', 'clue': 'Gold recognition'}
            ],
            'hip hop': [
                {'word': 'HIPHOP', 'clue': 'Culture that changed the world'},
                {'word': 'RAP', 'clue': 'Rhythm and poetry in motion'},
                {'word': 'BEAT', 'clue': 'The rhythm that moves you'},
                {'word': 'FLOW', 'clue': 'How you ride the beat'},
                {'word': 'RHYME', 'clue': 'When words sound the same'},
                {'word': 'VERSE', 'clue': 'Where the story gets told'},
                {'word': 'CHORUS', 'clue': 'The part you can\'t forget'},
                {'word': 'BARS', 'clue': 'Lines that hit different'},
                {'word': 'LYRICS', 'clue': 'Poetry set to a beat'},
                {'word': 'WORDPLAY', 'clue': 'Language gymnastics'},
                {'word': 'PUNCHLINE', 'clue': 'The line that lands'},
                {'word': 'METAPHOR', 'clue': 'Saying it without saying it'},
                {'word': 'FREESTYLE', 'clue': 'Off the dome, no script'},
                {'word': 'BATTLE', 'clue': 'Rap competition, verbal warfare'},
                {'word': 'CIPHER', 'clue': 'Freestyle circle, cypher'},
                {'word': 'DJ', 'clue': 'Master of the turntables'},
                {'word': 'MC', 'clue': 'Master of ceremonies, microphone controller'},
                {'word': 'PRODUCER', 'clue': 'Beat architect'},
                {'word': 'TURNTABLE', 'clue': 'Where records spin'},
                {'word': 'SCRATCH', 'clue': 'DJ\'s signature sound'},
                {'word': 'SAMPLER', 'clue': 'Sound recycler'},
                {'word': 'LOOP', 'clue': 'What goes round and round'},
                {'word': 'BREAK', 'clue': 'Drum solo that became history'},
                {'word': 'ALBUM', 'clue': 'Record collection, singular'},
                {'word': 'MIXTAPE', 'clue': 'Unofficial but still fire'},
                {'word': 'STUDIO', 'clue': 'Where the magic happens'},
                {'word': 'STAGE', 'clue': 'Where dreams perform'},
                {'word': 'CLUB', 'clue': 'Nighttime dance spot'},
                {'word': 'PARTY', 'clue': 'Where the music lives'},
                {'word': 'STREET', 'clue': 'Where it all started'}
            ],
            'r&b': [
                {'word': 'R&B', 'clue': 'Rhythm that gets you in your feelings'},
                {'word': 'SOUL', 'clue': 'What you pour into the mic'},
                {'word': 'SOULFUL', 'clue': 'Full of feeling and emotion'},
                {'word': 'SMOOTH', 'clue': 'Easy on the ears'},
                {'word': 'BALLAD', 'clue': 'Slow burn of emotion'},
                {'word': 'LOVE', 'clue': 'All you need, allegedly'},
                {'word': 'HEART', 'clue': 'Where the music really lives'},
                {'word': 'EMOTION', 'clue': 'What fills every note'},
                {'word': 'VOICE', 'clue': 'Powerful instrument'},
                {'word': 'SING', 'clue': 'Let it out'},
                {'word': 'MELODY', 'clue': 'The part that gets stuck'},
                {'word': 'HARMONY', 'clue': 'When voices become one'},
                {'word': 'CHORD', 'clue': 'Three notes in harmony'},
                {'word': 'PIANO', 'clue': 'Keys to unlocking emotion'},
                {'word': 'GUITAR', 'clue': 'Six strings of heartbreak'},
                {'word': 'BASS', 'clue': 'The foundation'},
                {'word': 'DRUMS', 'clue': 'What keeps the time'},
                {'word': 'BEAT', 'clue': 'The rhythm that moves you'},
                {'word': 'RHYTHM', 'clue': 'The pulse you can\'t ignore'},
                {'word': 'GROOVE', 'clue': 'The feel, the vibe'},
                {'word': 'ALBUM', 'clue': 'Record collection, singular'},
                {'word': 'SONG', 'clue': 'Three-minute emotion'},
                {'word': 'TRACK', 'clue': 'Single serving of sound'},
                {'word': 'LYRICS', 'clue': 'Words that tell the story'},
                {'word': 'STUDIO', 'clue': 'Where raw becomes refined'},
                {'word': 'MICROPHONE', 'clue': 'Voice amplifier'},
                {'word': 'STAGE', 'clue': 'Where dreams perform'},
                {'word': 'TOUR', 'clue': 'Taking the show on the road'},
                {'word': 'FAME', 'clue': 'Price of being known'},
                {'word': 'LEGEND', 'clue': 'Status they\'ve earned'}
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
            {'word': 'WORD', 'clue': 'What you are reading right now'},
            {'word': 'LETTER', 'clue': 'Building block of words'},
            {'word': 'PUZZLE', 'clue': 'What you are solving'},
            {'word': 'GAME', 'clue': 'Fun challenge'},
            {'word': 'PLAY', 'clue': 'Have fun with it'},
            {'word': 'FUN', 'clue': 'What makes it enjoyable'},
            {'word': 'BRAIN', 'clue': 'Your thinking machine'},
            {'word': 'THINK', 'clue': 'Use your gray matter'},
            {'word': 'SOLVE', 'clue': 'Crack the code'},
            {'word': 'CROSS', 'clue': 'Where paths meet'},
            {'word': 'DOWN', 'clue': 'Vertical direction'},
            {'word': 'ACROSS', 'clue': 'Horizontal direction'},
            {'word': 'CLUE', 'clue': 'The hint you are reading'},
            {'word': 'ANSWER', 'clue': 'What you are looking for'},
            {'word': 'GRID', 'clue': 'Network of squares'},
            {'word': 'BOX', 'clue': 'Where letters go'},
            {'word': 'LINE', 'clue': 'Straight connection'},
            {'word': 'SQUARE', 'clue': 'Four equal sides'},
            {'word': 'BLACK', 'clue': 'Darkest shade'},
            {'word': 'WHITE', 'clue': 'Lightest shade'},
            {'word': 'NUMBER', 'clue': 'Count it up'},
            {'word': 'COUNT', 'clue': 'Add them all'},
            {'word': 'TOTAL', 'clue': 'The final sum'},
            {'word': 'SUM', 'clue': 'Addition result'},
            {'word': 'ADD', 'clue': 'Put together'},
            {'word': 'MAKE', 'clue': 'Create something'},
            {'word': 'CREATE', 'clue': 'Bring to life'},
            {'word': 'BUILD', 'clue': 'Put it together'},
            {'word': 'FORM', 'clue': 'Shape it up'},
            {'word': 'SHAPE', 'clue': 'Give it form'}
        ]