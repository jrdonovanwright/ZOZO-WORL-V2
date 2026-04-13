"""
Game engine models — questions, answers, progress.

These mirror the TypeScript types in shared/types/index.ts.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional
import uuid

from pydantic import BaseModel, Field


class GameSubjectId(str, Enum):
    reading = "reading"
    math = "math"
    science = "science"
    social_studies = "social_studies"
    sel = "sel"
    arts = "arts"
    health = "health"


class QuestionType(str, Enum):
    multiple_choice = "multiple_choice"


class AnswerChoice(BaseModel):
    id: str           # "a" | "b" | "c" | "d"
    text: str         # display text
    emoji: Optional[str] = None  # optional visual hint


class GeneratedQuestion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    subject: GameSubjectId
    level: int        # 1–5
    type: QuestionType = QuestionType.multiple_choice
    prompt: str       # what Zoey reads aloud + displays
    choices: list[AnswerChoice]
    correct_id: str   # matches one AnswerChoice.id
    zoey_correct: str # Zoey's celebration (spoken after correct answer)
    zoey_wrong: str   # Zoey's encouragement (spoken after wrong answer)
    # False for SEL / Arts — no right/wrong, only reflective feedback
    scored: bool = True
    # TTS URLs filled in after synthesis
    tts_prompt_url: Optional[str] = None
    tts_correct_url: Optional[str] = None
    tts_wrong_url: Optional[str] = None


class QuestionRequest(BaseModel):
    child_id: str
    subject_id: GameSubjectId
    child_name: str
    child_age: int
    level: int = 1


class AnswerRequest(BaseModel):
    child_id: str
    subject_id: GameSubjectId
    question_id: str
    selected_id: str
    correct_id: str
    scored: bool = True
    level: int
    session_question_count: int  # total questions answered this session so far
    session_correct_count: int   # correct answers this session so far


class AnswerResponse(BaseModel):
    is_correct: bool
    new_level: Optional[int] = None   # set only when difficulty changes
    accuracy_rate: float              # lifetime accuracy for this subject


class ChildProgress(BaseModel):
    subject_id: GameSubjectId
    level: int = 1
    questions_answered: int = 0
    correct_count: int = 0
    accuracy_rate: float = 0.0
    last_played: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Adaptive difficulty advisor — GPT-4o mid-session coaching
# ---------------------------------------------------------------------------

class ResponseRecord(BaseModel):
    """A single answer event, used as input to the difficulty advisor."""
    question_text: str   # the prompt Zoey read aloud
    selected_text: str   # what the child tapped (answer text, not id)
    correct_text: str    # the correct answer text
    is_correct: bool


class DifficultyAdjustRequest(BaseModel):
    child_id: str
    child_name: str
    child_age: int
    subject_id: GameSubjectId
    skill_id: str              # subject for now; future: "reading.phonics"
    recent_responses: list[ResponseRecord]   # exactly 3
    current_difficulty: int    # 1–5


class DifficultyAdjustResponse(BaseModel):
    new_difficulty: int                    # 1–5
    zoey_cue: str                          # "encourage" | "challenge" | "scaffold"
    zoey_message: str                      # Zoey speaks this (scaffold/challenge only)
    tts_url: Optional[str] = None
