"""
Unified Memory System models — personal memory, progression state,
skill tree, active session, session history, and all API contracts.
"""
from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


# ─── Layer 1: Personal Memory ────────────────────────────────────────────────

class FunnyMoment(BaseModel):
    description: str
    date: str  # YYYY-MM-DD


class BigWin(BaseModel):
    skill_id: str
    description: str
    date: str  # YYYY-MM-DD


class FamilyMention(BaseModel):
    name: str
    relationship: str


class ZoeyMemory(BaseModel):
    favorite_animal: Optional[str] = None
    favorite_color: Optional[str] = None
    interests: list[str] = []
    funny_moments: list[FunnyMoment] = []
    big_wins: list[BigWin] = []
    current_goal: Optional[str] = None
    family_mentions: list[FamilyMention] = []
    recent_topics: list[str] = []
    personality_notes: list[str] = []
    last_memory_update: Optional[str] = None  # ISO-8601


# ─── Layer 2A: Global Progression State ──────────────────────────────────────

ZoneName = Literal[
    "readingForest", "mathIsland", "scienceLab",
    "cultureCorner", "feelingField", "storyMode",
]


class ProgressionState(BaseModel):
    current_zone: Optional[str] = None
    last_active_zone: Optional[str] = None
    zones_unlocked: list[str] = Field(default_factory=lambda: ["readingForest", "mathIsland"])
    zones_completed: list[str] = []
    total_skills_mastered: int = 0
    total_sessions_completed: int = 0
    current_streak: int = 0
    longest_streak: int = 0
    last_active_date: Optional[str] = None
    overall_mastery_percent: float = 0.0
    grade_level: str = "Kindergarten"
    last_updated: Optional[str] = None


# ─── Layer 2B: Per-Subject Skill State ───────────────────────────────────────

SkillStatus = Literal["locked", "available", "in-progress", "mastered"]


class SkillState(BaseModel):
    status: SkillStatus = "locked"
    attempts: int = 0
    correct_attempts: int = 0
    mastery_score: float = 0.0
    last_attempt: Optional[str] = None
    misconceptions: list[str] = []
    teacher_assigned: bool = False
    unlocked_at: Optional[str] = None
    mastered_at: Optional[str] = None


# ─── Layer 2C: Active Session ────────────────────────────────────────────────

ActivityType = Literal[
    "lesson", "game", "read-aloud", "conversation", "story", "family-play",
]


class StoryModeState(BaseModel):
    story_id: str
    current_beat: int = 0
    beats_completed: list[int] = []
    story_data: dict = {}


class ActiveSession(BaseModel):
    session_id: str
    session_status: Literal["active", "paused", "complete"] = "active"
    started_at: str                       # ISO-8601
    last_heartbeat: str                   # ISO-8601
    current_zone: Optional[str] = None
    current_skill_id: Optional[str] = None
    current_activity_type: Optional[ActivityType] = None
    current_activity_step: int = 0
    current_difficulty: int = 1
    questions_answered_this_skill: int = 0
    correct_this_skill: int = 0
    story_mode_state: Optional[StoryModeState] = None
    session_mood: Optional[str] = None
    activities_completed_this_session: list[str] = []
    skills_attempted_this_session: list[str] = []
    skills_mastered_this_session: list[str] = []
    zoey_asks_log: list[dict] = []
    offline_mode: bool = False


# ─── API Request / Response Types ────────────────────────────────────────────

class TranscriptTurn(BaseModel):
    speaker: Literal["zoey", "child"]
    text: str


class UpdatePersonalMemoryRequest(BaseModel):
    child_id: str
    session_transcript: list[TranscriptTurn]
    current_memory: ZoeyMemory


class BuildSessionContextRequest(BaseModel):
    child_id: str
    child_name: str
    child_age: int


class SessionPersonalization(BaseModel):
    memory_reference: str = ""
    mood_adjustment: str = ""
    teacher_assignment: Optional[dict] = None


class SessionContextResponse(BaseModel):
    resume_session: bool = False
    resume_context: Optional[dict] = None
    zoey_opening_script: str = ""
    recommended_zone: str = "readingForest"
    recommended_skill: str = "reading.level_1"
    session_personalization: SessionPersonalization = Field(default_factory=SessionPersonalization)
    gpt_system_prompt_insert: str = ""
    tts_url: Optional[str] = None


class MemoryMomentRequest(BaseModel):
    child_id: str
    current_activity: str
    last_skill_mastered: Optional[str] = None


class MemoryMomentResponse(BaseModel):
    zoey_line: str
    memory_used: str
    tts_url: Optional[str] = None


class SkillResponse(BaseModel):
    question_text: str
    selected_answer: str
    correct_answer: str
    is_correct: bool


class AssessAndAdvanceRequest(BaseModel):
    child_id: str
    subject: str            # e.g. "reading"
    skill_id: str           # e.g. "reading.level_1"
    responses: list[SkillResponse]


class AssessAndAdvanceResponse(BaseModel):
    skill_state: SkillState
    progression_state: ProgressionState
    next_skill_unlocked: bool = False
    next_skill_id: Optional[str] = None


class HeartbeatRequest(BaseModel):
    current_activity_step: int = 0
    session_mood: Optional[str] = None


class StartSessionRequest(BaseModel):
    child_id: str
    zone: Optional[str] = None
    skill_id: Optional[str] = None
    activity_type: Optional[ActivityType] = None


class ArchiveSessionRequest(BaseModel):
    child_id: str
    partial: bool = False   # True if archived due to abandonment


class SyncOfflineSessionRequest(BaseModel):
    child_id: str
    session_log: ActiveSession
    skill_updates: list[dict] = []


class DeleteMemoryEntryRequest(BaseModel):
    child_id: str
    field: str              # e.g. "funnyMoments"
    index: Optional[int] = None  # array index to remove, or None for scalar fields


class ProgressionSummaryResponse(BaseModel):
    progression_state: ProgressionState
    skills_per_subject: dict[str, dict]  # { "reading": { "mastered": 2, "total": 5, ... } }
    narrative: str
    headline: str
