from dataclasses import dataclass
from typing import List, Optional, Tuple
from enum import Enum

class Direction(Enum):
    HORIZONTAL = "horizontal"
    VERTICAL = "vertical"

@dataclass
class WordPlacement:
    word: str
    start_row: int
    start_col: int
    direction: Direction
    clue: str = ""

@dataclass
class CrosswordGrid:
    grid: List[List[Optional[str]]]
    width: int
    height: int
    word_placements: List[WordPlacement]