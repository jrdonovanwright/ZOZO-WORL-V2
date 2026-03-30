"""
AI difficulty advisor — GPT-4o mid-session coaching.

Receives the last 3 response records from a game session, determines the
appropriate zoey_cue (scaffold / encourage / challenge), adjusts difficulty
if warranted, and synthesizes a TTS clip for scaffold and challenge cues.

Encourage cues don't interrupt gameplay so their TTS is skipped.
"""
from __future__ import annotations

import json
import logging
from functools import lru_cache
from pathlib import Path

from openai import AsyncOpenAI

from app.core.config import settings
from app.models.game import DifficultyAdjustRequest, DifficultyAdjustResponse
from app.services.tts import elevenlabs_service as tts

logger = logging.getLogger(__name__)

_GPT_MODEL = "gpt-4o-2024-11-20"

_REPO_ROOT = Path(__file__).parents[4]
_PROMPTS_DIR = _REPO_ROOT / "shared" / "prompts" / "game"

_VALID_CUES = {"encourage", "challenge", "scaffold"}
_MIN_LEVEL = 1
_MAX_LEVEL = 5


@lru_cache(maxsize=None)
def _load_prompt(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    return "\n".join(l for l in text.splitlines() if not l.startswith("# ")).strip()


def _system_prompt() -> str:
    return _load_prompt(_PROMPTS_DIR / "difficulty_advisor.md")


def _format_responses(req: DifficultyAdjustRequest) -> str:
    lines = [
        f"Child: {req.child_name}, age {req.child_age}",
        f"Subject: {req.subject_id.value}",
        f"Current difficulty: {req.current_difficulty}",
        "",
        "Last 3 responses:",
    ]
    for i, r in enumerate(req.recent_responses, 1):
        result = "✓ correct" if r.is_correct else "✗ wrong"
        lines.append(f"  {i}. Q: \"{r.question_text[:120]}\"")
        lines.append(f"     Selected: \"{r.selected_text}\"  |  Correct: \"{r.correct_text}\"  |  {result}")
    return "\n".join(lines)


async def adjust_difficulty(req: DifficultyAdjustRequest) -> DifficultyAdjustResponse:
    client = AsyncOpenAI(api_key=settings.openai_api_key)

    response = await client.chat.completions.create(
        model=_GPT_MODEL,
        messages=[
            {"role": "system", "content": _system_prompt()},
            {"role": "user",   "content": _format_responses(req)},
        ],
        response_format={"type": "json_object"},
        temperature=0.7,
        max_tokens=250,
    )

    raw = response.choices[0].message.content or "{}"
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        logger.error("Difficulty advisor returned invalid JSON: %s", raw[:200])
        raise ValueError("Difficulty advisor failed — invalid JSON")

    zoey_cue = data.get("zoey_cue", "encourage")
    if zoey_cue not in _VALID_CUES:
        logger.warning("Unknown zoey_cue %r, defaulting to encourage", zoey_cue)
        zoey_cue = "encourage"

    # Clamp difficulty within valid range
    new_difficulty = int(data.get("new_difficulty", req.current_difficulty))
    new_difficulty = max(_MIN_LEVEL, min(_MAX_LEVEL, new_difficulty))

    zoey_message = data.get("zoey_message", "")

    logger.info(
        "Difficulty advice | child=%s subject=%s %d→%d cue=%s",
        req.child_id, req.subject_id.value,
        req.current_difficulty, new_difficulty, zoey_cue,
    )

    # Only synthesize TTS for cues that interrupt gameplay (scaffold + challenge).
    # Encourage plays no audio — it just keeps the session flowing.
    tts_url: str | None = None
    if zoey_cue in ("scaffold", "challenge") and zoey_message:
        result = await tts.synthesize(zoey_message)
        tts_url = result if isinstance(result, str) else None

    return DifficultyAdjustResponse(
        new_difficulty=new_difficulty,
        zoey_cue=zoey_cue,
        zoey_message=zoey_message,
        tts_url=tts_url,
    )
