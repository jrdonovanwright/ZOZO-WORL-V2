"""
World map greeting generator.

Calls GPT-4o to produce Zoey's personalized session greeting and zone
recommendation, then synthesizes the greeting via ElevenLabs TTS.
"""
from __future__ import annotations

import json
import logging
from functools import lru_cache
from pathlib import Path

from openai import AsyncOpenAI

from app.core.config import settings
from app.models.world import WorldGreetingRequest, WorldGreetingResponse
from app.services.tts import elevenlabs_service as tts

logger = logging.getLogger(__name__)

_GPT_MODEL = "gpt-4o-2024-11-20"

_REPO_ROOT = Path(__file__).parents[4]
_WORLD_PROMPTS_DIR = _REPO_ROOT / "shared" / "prompts" / "world"

_VALID_ZONES = {"reading", "math", "science", "social_studies", "sel"}


@lru_cache(maxsize=None)
def _load_prompt(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    return "\n".join(l for l in lines if not l.startswith("# ")).strip()


def _system_prompt() -> str:
    return _load_prompt(_WORLD_PROMPTS_DIR / "greeting.md")


def _format_progress(req: WorldGreetingRequest) -> str:
    if not req.subject_progress:
        return "No prior sessions — this child is brand new to the world."

    lines = ["Subject progress:"]
    for p in req.subject_progress:
        last = f"last played: {p.last_played}" if p.last_played else "never played"
        lines.append(
            f"  - {p.subject_id}: level {p.level}, "
            f"{p.questions_answered} questions answered, "
            f"{int(p.accuracy_rate * 100)}% accuracy, {last}"
        )
    return "\n".join(lines)


async def generate_world_greeting(req: WorldGreetingRequest) -> WorldGreetingResponse:
    user_message = (
        f"Child's name: {req.child_name}\n"
        f"Child's age: {req.child_age}\n"
        f"Time of day: {req.time_of_day}\n"
        f"\n{_format_progress(req)}"
    )

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    response = await client.chat.completions.create(
        model=_GPT_MODEL,
        messages=[
            {"role": "system", "content": _system_prompt()},
            {"role": "user", "content": user_message},
        ],
        response_format={"type": "json_object"},
        temperature=0.85,
        max_tokens=200,
    )

    raw = response.choices[0].message.content or "{}"
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        logger.error("GPT-4o returned invalid JSON for world greeting: %s", raw[:200])
        raise ValueError("World greeting generation failed")

    greeting_text = data.get("greeting", f"Hi {req.child_name}! Welcome back to our world!")
    recommended_zone = data.get("recommended_zone", "math")

    # Guard against hallucinated zone names
    if recommended_zone not in _VALID_ZONES:
        logger.warning("GPT-4o returned unknown zone %r, falling back to math", recommended_zone)
        recommended_zone = "math"

    logger.info(
        "World greeting generated | child=%s zone=%s",
        req.child_id, recommended_zone,
    )

    # Synthesize TTS — non-blocking if it fails
    tts_result = await tts.synthesize(greeting_text)
    tts_url = tts_result if isinstance(tts_result, str) else None

    return WorldGreetingResponse(
        greeting=greeting_text,
        recommended_zone=recommended_zone,
        tts_url=tts_url,
    )
