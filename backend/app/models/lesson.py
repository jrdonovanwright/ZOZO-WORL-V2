"""
Micro-lesson (Zoey Explains) models.
"""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel

FollowUpActivityType = Literal["multiple-choice", "drag-drop", "read-aloud", "conversation"]


class GenerateLessonRequest(BaseModel):
    skill_id: str                         # e.g. "reading.level_1", "math.level_2"
    grade_level: str                      # e.g. "Kindergarten", "1st grade"
    child_name: str
    child_age: int
    prior_misconceptions: list[str] = []  # plain-language strings from recent session errors


class GenerateLessonResponse(BaseModel):
    script: str                           # full spoken text for ElevenLabs
    follow_up_activity_type: FollowUpActivityType
    lesson_title: str                     # short display title (3–6 words)
    key_concept: str                      # one-sentence summary shown after playback
    tts_url: Optional[str] = None        # ElevenLabs signed URL; None if synthesis failed
    estimated_duration_seconds: int = 75  # derived from word count; used by progress bar
