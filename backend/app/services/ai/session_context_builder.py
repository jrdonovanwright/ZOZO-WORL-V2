"""
Unified Session Context Builder — assembles all memory layers into a single
context object for session start. Produces the GPT-4o system prompt insert
and Zoey's opening script with TTS.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path

from openai import AsyncOpenAI

from app.models.memory import (
    ActiveSession,
    BuildSessionContextRequest,
    ProgressionState,
    SessionContextResponse,
    SessionPersonalization,
    ZoeyMemory,
)
from app.services.firebase.memory_store import (
    get_active_session,
    get_progression_state,
    get_zoey_memory,
)
from app.services.tts.elevenlabs_service import synthesize

logger = logging.getLogger(__name__)
_client = AsyncOpenAI()

PROMPTS_DIR = Path(__file__).parents[5] / "shared" / "prompts"


@lru_cache(maxsize=1)
def _load_prompt() -> str:
    return (PROMPTS_DIR / "memory" / "session_context.md").read_text()


def _grade_level(age: int) -> str:
    if age <= 4:
        return "Pre-K"
    if age == 5:
        return "Kindergarten"
    if age == 6:
        return "1st grade"
    if age == 7:
        return "2nd grade"
    if age == 8:
        return "3rd grade"
    return "3rd-4th grade"


def _minutes_since(iso_str: str | None) -> float:
    if not iso_str:
        return 999999
    try:
        then = datetime.fromisoformat(iso_str)
        if then.tzinfo is None:
            then = then.replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc) - then).total_seconds() / 60
    except Exception:
        return 999999


def _same_day(iso_str: str | None) -> bool:
    if not iso_str:
        return False
    try:
        then = datetime.fromisoformat(iso_str).date()
        return then == datetime.now(timezone.utc).date()
    except Exception:
        return False


async def build_session_context(req: BuildSessionContextRequest) -> SessionContextResponse:
    """Assemble all memory layers and generate session context via GPT-4o."""

    # Fetch all layers in parallel (conceptually — asyncio.gather)
    import asyncio

    raw_memory, raw_progression, raw_session = await asyncio.gather(
        get_zoey_memory(req.child_id),
        get_progression_state(req.child_id),
        get_active_session(req.child_id),
    )

    memory = ZoeyMemory(**(raw_memory or {}))
    progression = ProgressionState(**(raw_progression or {}))
    session = ActiveSession(**raw_session) if raw_session else None

    grade = _grade_level(req.child_age)

    # Determine resume case
    resume_session = False
    resume_context = None
    if session and session.session_status in ("active", "paused"):
        mins = _minutes_since(session.last_heartbeat)
        same_day = _same_day(session.last_heartbeat)
        if mins <= 30:
            resume_session = True
            resume_context = {"case": 1, "minutes_away": round(mins), "session": session.model_dump()}
        elif same_day:
            resume_session = True
            resume_context = {"case": 2, "minutes_away": round(mins), "session": session.model_dump()}
        else:
            # Case 3 — abandoned, will be archived by the client
            resume_context = {"case": 3, "session": session.model_dump()}

    # Build GPT-4o input
    user_msg = (
        f"childName: {req.child_name}\n"
        f"childAge: {req.child_age}\n"
        f"gradeLevel: {grade}\n"
        f"zoeyMemory: {json.dumps(memory.model_dump(), default=str)}\n"
        f"progressionState: {json.dumps(progression.model_dump(), default=str)}\n"
        f"activeSession: {json.dumps(session.model_dump(), default=str) if session else 'null'}\n"
        f"resumeCase: {resume_context['case'] if resume_context else 'none'}\n"
        f"moodProfile: null\n"
        f"teacherAssignments: null\n"
    )

    prompt = _load_prompt()

    response = await _client.chat.completions.create(
        model="gpt-4o-2024-11-20",
        response_format={"type": "json_object"},
        temperature=0.8,
        max_tokens=800,
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": user_msg},
        ],
    )

    raw = json.loads(response.choices[0].message.content or "{}")

    opening_script = raw.get("zoeyOpeningScript", f"Hey {req.child_name}! Ready to learn today?")
    tts_url = await synthesize(opening_script)

    return SessionContextResponse(
        resume_session=resume_session,
        resume_context=resume_context,
        zoey_opening_script=opening_script,
        recommended_zone=raw.get("recommendedZone", "readingForest"),
        recommended_skill=raw.get("recommendedSkill", "reading.level_1"),
        session_personalization=SessionPersonalization(
            memory_reference=raw.get("memoryReference", ""),
            mood_adjustment=raw.get("moodAdjustment", ""),
        ),
        gpt_system_prompt_insert=raw.get("gptSystemPromptInsert", ""),
        tts_url=tts_url,
    )
