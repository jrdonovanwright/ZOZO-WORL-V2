from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


class ChallengeStep(BaseModel):
    day: str                                              # "Monday" .. "Friday"
    activity_type: Literal["game", "lesson", "conversation"]
    skill_id: str                                         # e.g. "reading.level_1"
    description: str
    completed: bool = False
    completed_at: Optional[str] = None                    # ISO-8601 UTC


class WeeklyChallenge(BaseModel):
    """Shape stored in children/{child_id}/weeklyChallenges/{week_id}."""
    week_id: str                    # e.g. "2026-W14"
    child_name: str
    grade_level: str
    challenge_title: str
    description: str
    zoey_intro_line: str
    steps: list[ChallengeStep]
    reward_badge: str               # single emoji
    created_at: str                 # ISO-8601 UTC
    completed_at: Optional[str] = None


class GenerateChallengeRequest(BaseModel):
    child_id: str
    child_name: str
    grade_level: str
    top_weak_skills: list[str] = Field(default_factory=list, max_length=5)
    interests: list[str] = Field(default_factory=list, max_length=3)


class GenerateChallengeResponse(BaseModel):
    challenge: WeeklyChallenge


class CompleteStepRequest(BaseModel):
    child_id: str
    day: str                        # "Monday" .. "Friday" — which step was completed
