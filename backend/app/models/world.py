"""
World map models — session greeting and zone state.
"""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class SubjectProgressSummary(BaseModel):
    subject_id: str          # GameSubjectId value
    level: int = 1
    accuracy_rate: float = 0.0
    questions_answered: int = 0
    last_played: Optional[str] = None   # ISO 8601 string or None


class WorldGreetingRequest(BaseModel):
    child_id: str
    child_name: str
    child_age: int
    time_of_day: str                              # "morning" | "afternoon" | "evening"
    subject_progress: list[SubjectProgressSummary] = []


class WorldGreetingResponse(BaseModel):
    greeting: str             # Zoey's spoken greeting
    recommended_zone: str     # GameSubjectId value
    tts_url: Optional[str] = None
