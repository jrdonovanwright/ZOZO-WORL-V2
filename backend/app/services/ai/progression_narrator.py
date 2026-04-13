"""
Progression Narrator — generates a human-readable narrative of the child's
learning journey for the Parent Dashboard.
"""
from __future__ import annotations

import json
import logging
from functools import lru_cache
from pathlib import Path

from openai import AsyncOpenAI

from app.models.memory import ProgressionState, ProgressionSummaryResponse
from app.services.firebase.memory_store import (
    get_progression_state,
    list_sessions,
    list_skills,
)

logger = logging.getLogger(__name__)
_client = AsyncOpenAI()

PROMPTS_DIR = Path(__file__).parents[5] / "shared" / "prompts"

_SUBJECTS = ["reading", "math", "science", "social_studies", "sel"]


@lru_cache(maxsize=1)
def _load_prompt() -> str:
    return (PROMPTS_DIR / "memory" / "progression_narrative.md").read_text()


async def generate_progression_summary(
    child_id: str,
    child_name: str,
    child_age: int,
) -> ProgressionSummaryResponse:
    """Build full progression summary with GPT-4o narrative."""
    import asyncio

    raw_prog, recent_sessions, *skill_lists = await asyncio.gather(
        get_progression_state(child_id),
        list_sessions(child_id, limit=5),
        *[list_skills(child_id, subj) for subj in _SUBJECTS],
    )

    progression = ProgressionState(**(raw_prog or {}))

    # Build per-subject summary
    skills_per_subject: dict[str, dict] = {}
    for subj, skills in zip(_SUBJECTS, skill_lists):
        mastered = sum(1 for s in skills if s.get("status") == "mastered")
        in_progress = sum(1 for s in skills if s.get("status") == "in-progress")
        available = sum(1 for s in skills if s.get("status") == "available")
        total = len(skills) if skills else 5  # default 5 levels per subject
        skills_per_subject[subj] = {
            "mastered": mastered,
            "in_progress": in_progress,
            "available": available,
            "total": max(total, 5),
        }

    # Format sessions for GPT
    session_summaries = []
    for sess in recent_sessions[:5]:
        session_summaries.append({
            "zones": sess.get("skills_attempted_this_session", []),
            "mastered": sess.get("skills_mastered_this_session", []),
            "mood": sess.get("session_mood", "unknown"),
        })

    grade = "Kindergarten"
    if child_age <= 4:
        grade = "Pre-K"
    elif child_age == 6:
        grade = "1st grade"

    prompt = _load_prompt()
    user_msg = (
        f"childName: {child_name}\n"
        f"childAge: {child_age}\n"
        f"gradeLevel: {grade}\n"
        f"progressionState: {json.dumps(progression.model_dump(), default=str)}\n"
        f"skillSummary: {json.dumps(skills_per_subject)}\n"
        f"recentSessions: {json.dumps(session_summaries)}"
    )

    response = await _client.chat.completions.create(
        model="gpt-4o-2024-11-20",
        response_format={"type": "json_object"},
        temperature=0.7,
        max_tokens=400,
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": user_msg},
        ],
    )

    raw = json.loads(response.choices[0].message.content or "{}")

    return ProgressionSummaryResponse(
        progression_state=progression,
        skills_per_subject=skills_per_subject,
        narrative=raw.get("narrative", f"{child_name} is just getting started on their learning journey!"),
        headline=raw.get("headline", "Just getting started"),
    )
