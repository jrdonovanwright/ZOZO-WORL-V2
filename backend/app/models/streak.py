from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


StreakStatus = Literal["active", "at-risk"]


class StreakData(BaseModel):
    """Shape stored in and read from Firestore at children/{child_id}/streaks/current."""
    current_streak: int = 0
    last_active_date: Optional[str] = None   # YYYY-MM-DD or None if brand new
    longest_streak: int = 0
    streak_status: StreakStatus = "active"
    updated_at: Optional[str] = None         # ISO-8601 UTC


class StreakResponse(BaseModel):
    """Returned to the client — adds computed visual state."""
    current_streak: int
    longest_streak: int
    streak_status: StreakStatus
    last_active_date: Optional[str] = None
    plant_stage: int = Field(ge=0, le=7, description="0 = no streak, 1–7 = growth stages")
    already_recorded_today: bool = False


class RecordActivityRequest(BaseModel):
    child_id: str


class StreakCommentaryRequest(BaseModel):
    child_id: str
    child_name: str
    time_of_day: Literal["morning", "afternoon", "evening"] = "morning"


class StreakCommentaryResponse(BaseModel):
    commentary: str
    tts_url: Optional[str] = None
