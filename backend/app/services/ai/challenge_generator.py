"""
Weekly Zoey Challenge generator.

Calls GPT-4o to produce a 5-step weekly challenge tailored to the child's
weak skills and interests, then stores it in Firestore.
"""
from __future__ import annotations

import json
import logging
from datetime import date, datetime, timezone
from functools import lru_cache
from pathlib import Path

from openai import AsyncOpenAI

from app.models.challenge import (
    ChallengeStep,
    GenerateChallengeRequest,
    GenerateChallengeResponse,
    WeeklyChallenge,
)
from app.services.firebase.firestore import get_challenge, set_challenge

logger = logging.getLogger(__name__)
_client = AsyncOpenAI()

PROMPTS_DIR = Path(__file__).parents[5] / "shared" / "prompts"


@lru_cache(maxsize=1)
def _load_prompt() -> str:
    return (PROMPTS_DIR / "challenge" / "generate.md").read_text()


def current_week_id() -> str:
    """ISO year-week string, e.g. '2026-W14'."""
    year, week, _ = date.today().isocalendar()
    return f"{year}-W{week:02d}"


def _build_user_message(req: GenerateChallengeRequest) -> str:
    return (
        f"childName: {req.child_name}\n"
        f"gradeLevel: {req.grade_level}\n"
        f"topWeakSkills: {json.dumps(req.top_weak_skills)}\n"
        f"interests: {json.dumps(req.interests)}\n"
        f"\n"
        f"Return a JSON object with keys: challengeTitle, description, "
        f"zoeyIntroLine, steps, rewardBadge."
    )


_VALID_DAYS = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday"}


async def generate_challenge(req: GenerateChallengeRequest) -> GenerateChallengeResponse:
    week_id = current_week_id()

    # Check if one already exists for this week
    existing = await get_challenge(req.child_id, week_id)
    if existing:
        return GenerateChallengeResponse(challenge=WeeklyChallenge(**existing))

    prompt = _load_prompt()
    user_msg = _build_user_message(req)

    response = await _client.chat.completions.create(
        model="gpt-4o-2024-11-20",
        response_format={"type": "json_object"},
        temperature=0.85,
        max_tokens=800,
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": user_msg},
        ],
    )

    raw = json.loads(response.choices[0].message.content or "{}")

    # Parse and validate steps
    raw_steps = raw.get("steps", [])[:5]
    steps: list[ChallengeStep] = []
    for s in raw_steps:
        day = s.get("day", "Monday")
        if day not in _VALID_DAYS:
            day = "Monday"
        steps.append(
            ChallengeStep(
                day=day,
                activity_type=s.get("activityType", "game"),
                skill_id=s.get("skillId", "reading.level_1"),
                description=s.get("description", "Complete today's activity!"),
                completed=False,
                completed_at=None,
            )
        )

    # Ensure we have exactly 5 steps
    while len(steps) < 5:
        fallback_days = list(_VALID_DAYS - {s.day for s in steps})
        steps.append(
            ChallengeStep(
                day=fallback_days[0] if fallback_days else "Friday",
                activity_type="game",
                skill_id=req.top_weak_skills[0] if req.top_weak_skills else "reading.level_1",
                description="Surprise bonus activity with Zoey!",
            )
        )

    challenge = WeeklyChallenge(
        week_id=week_id,
        child_name=req.child_name,
        grade_level=req.grade_level,
        challenge_title=raw.get("challengeTitle", "Zoey's Weekly Adventure"),
        description=raw.get("description", f"A special week of learning for {req.child_name}!"),
        zoey_intro_line=raw.get("zoeyIntroLine", f"{req.child_name}, we have a special quest this week!"),
        steps=steps,
        reward_badge=raw.get("rewardBadge", "🌟"),
        created_at=datetime.now(timezone.utc).isoformat(),
        completed_at=None,
    )

    await set_challenge(req.child_id, week_id, challenge.model_dump())
    return GenerateChallengeResponse(challenge=challenge)
