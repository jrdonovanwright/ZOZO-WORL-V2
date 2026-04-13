"""
Streak commentary generator.

Produces a single Zoey spoken line about the child's learning streak,
then synthesizes it via ElevenLabs. Called on session start from the
world map screen so Zoey can comment on the garden's growth.
"""
from __future__ import annotations

import json
import logging
from functools import lru_cache
from pathlib import Path

from openai import AsyncOpenAI

from app.models.streak import StreakCommentaryRequest, StreakCommentaryResponse, StreakData
from app.services.tts.elevenlabs_service import synthesize

logger = logging.getLogger(__name__)
_client = AsyncOpenAI()

PROMPTS_DIR = Path(__file__).parents[5] / "shared" / "prompts"


@lru_cache(maxsize=1)
def _load_prompt() -> str:
    return (PROMPTS_DIR / "streak" / "commentary.md").read_text()


def _build_user_message(req: StreakCommentaryRequest, streak: StreakData) -> str:
    return (
        f"childName: {req.child_name}\n"
        f"currentStreak: {streak.current_streak}\n"
        f"streakStatus: {streak.streak_status}\n"
        f"longestStreak: {streak.longest_streak}\n"
        f"timeOfDay: {req.time_of_day}"
    )


async def generate_commentary(
    req: StreakCommentaryRequest,
    streak: StreakData,
) -> StreakCommentaryResponse:
    prompt = _load_prompt()
    user_msg = _build_user_message(req, streak)

    response = await _client.chat.completions.create(
        model="gpt-4o-2024-11-20",
        response_format={"type": "json_object"},
        temperature=0.9,
        max_tokens=120,
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": user_msg},
        ],
    )

    raw = json.loads(response.choices[0].message.content or "{}")
    commentary = raw.get("commentary", f"Hey {req.child_name}, let's learn together today!")

    tts_url = await synthesize(commentary)

    return StreakCommentaryResponse(commentary=commentary, tts_url=tts_url)
