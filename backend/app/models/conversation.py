from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Child context (caller-supplied; backend trusts Firebase auth for child_id)
# ---------------------------------------------------------------------------

class MasterySummary(BaseModel):
    """Sparse map of skill_id → score (0.0–1.0). Only include recently active skills."""
    scores: dict[str, float] = Field(default_factory=dict)


class ChildContext(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    age: int = Field(..., ge=4, le=6)
    mastery_summary: MasterySummary = Field(default_factory=MasterySummary)
    # Anything Zoey should remember from previous sessions (short, plain-text facts)
    zoey_memories: list[str] = Field(default_factory=list, max_length=10)


# ---------------------------------------------------------------------------
# Conversation history
# ---------------------------------------------------------------------------

class ConversationTurn(BaseModel):
    role: Literal["zoey", "child"]
    text: str


# ---------------------------------------------------------------------------
# Input — voice or text
# ---------------------------------------------------------------------------

class AudioInput(BaseModel):
    type: Literal["audio"] = "audio"
    # Raw audio bytes encoded as base64. Accepted formats: m4a, mp4, webm, mp3, wav.
    audio_b64: str
    mime_type: str = "audio/m4a"


class TextInput(BaseModel):
    type: Literal["text"] = "text"
    text: str = Field(..., min_length=1, max_length=500)


# ---------------------------------------------------------------------------
# Request / Response
# ---------------------------------------------------------------------------

class ConversationRequest(BaseModel):
    child_id: str
    session_id: str
    subject_id: Literal["reading", "math", "culture", "science", "free_talk"]
    child_context: ChildContext
    # History excludes the current turn; newest last.
    history: list[ConversationTurn] = Field(default_factory=list, max_length=20)
    input: AudioInput | TextInput = Field(..., discriminator="type")


class ConversationResponse(BaseModel):
    # The child's words (transcribed from audio, or echo of text input)
    transcript: str
    # Zoey's reply text
    zoey_text: str
    # Firebase Storage URL for Zoey's TTS audio (None if TTS failed — degrade gracefully)
    audio_url: Optional[str] = None
    # Opaque token usage info for cost tracking
    usage: Optional[dict] = None
