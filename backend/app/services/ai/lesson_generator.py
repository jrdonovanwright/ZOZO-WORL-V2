"""
Micro-lesson generator — Zoey Explains.

Builds a 60–90 second spoken script tailored to the child's skill node,
grade level, and any prior misconceptions, then synthesizes it via ElevenLabs.
The TTS call is the most expensive part (~3–6 s for a 150-word clip); the
signed URL is cached in Firebase Storage so repeat lessons are instant.
"""
from __future__ import annotations

import json
import logging
from functools import lru_cache
from pathlib import Path

from openai import AsyncOpenAI

from app.core.config import settings
from app.models.lesson import GenerateLessonRequest, GenerateLessonResponse
from app.services.tts import elevenlabs_service as tts

logger = logging.getLogger(__name__)

_GPT_MODEL = "gpt-4o-2024-11-20"
_REPO_ROOT = Path(__file__).parents[4]
_PROMPT_PATH = _REPO_ROOT / "shared" / "prompts" / "lesson" / "generate.md"

_VALID_ACTIVITY_TYPES = {"multiple-choice", "drag-drop", "read-aloud", "conversation"}
# Approximate words-per-second for Zoey's TTS voice at the configured settings
_WORDS_PER_SECOND = 2.2


@lru_cache(maxsize=None)
def _system_prompt() -> str:
    text = _PROMPT_PATH.read_text(encoding="utf-8")
    return "\n".join(l for l in text.splitlines() if not l.startswith("# ")).strip()


def _words_to_seconds(script: str) -> int:
    """Estimate TTS duration in whole seconds from word count."""
    word_count = len(script.split())
    return max(45, round(word_count / _WORDS_PER_SECOND))


def _build_user_message(req: GenerateLessonRequest) -> str:
    lines = [
        f"Skill node: {req.skill_id}",
        f"Child's name: {req.child_name}",
        f"Child's age: {req.child_age}",
        f"Grade level: {req.grade_level}",
    ]
    if req.prior_misconceptions:
        lines.append("Prior misconceptions (address the most relevant one in the script):")
        for m in req.prior_misconceptions:
            lines.append(f"  - {m}")
    else:
        lines.append("Prior misconceptions: none — this is the child's first time with this skill.")
    return "\n".join(lines)


async def generate_lesson(req: GenerateLessonRequest) -> GenerateLessonResponse:
    client = AsyncOpenAI(api_key=settings.openai_api_key)

    response = await client.chat.completions.create(
        model=_GPT_MODEL,
        messages=[
            {"role": "system", "content": _system_prompt()},
            {"role": "user",   "content": _build_user_message(req)},
        ],
        response_format={"type": "json_object"},
        temperature=0.85,
        max_tokens=600,
    )

    raw = response.choices[0].message.content or "{}"
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        logger.error("Lesson generator returned invalid JSON for skill=%s: %s", req.skill_id, raw[:200])
        raise ValueError("Lesson generation failed — invalid JSON from GPT-4o")

    script = data.get("script", "")
    if not script:
        raise ValueError("Lesson generation produced an empty script")

    activity_type = data.get("follow_up_activity_type", "multiple-choice")
    if activity_type not in _VALID_ACTIVITY_TYPES:
        logger.warning("Unknown activity type %r, defaulting to multiple-choice", activity_type)
        activity_type = "multiple-choice"

    duration = _words_to_seconds(script)

    logger.info(
        "Lesson generated | skill=%s grade=%s words=%d activity=%s",
        req.skill_id, req.grade_level, len(script.split()), activity_type,
    )

    # Synthesize TTS — the script is long so this may take 3–6 s.
    # The result is cached by Firebase Storage key, so repeat lessons are instant.
    tts_result = await tts.synthesize(script)
    tts_url = tts_result if isinstance(tts_result, str) else None

    if not tts_url:
        logger.warning("TTS synthesis failed for lesson skill=%s — lesson will be text-only", req.skill_id)

    return GenerateLessonResponse(
        script=script,
        follow_up_activity_type=activity_type,          # type: ignore[arg-type]
        lesson_title=data.get("lesson_title", req.skill_id.replace(".", " ").title()),
        key_concept=data.get("key_concept", ""),
        tts_url=tts_url,
        estimated_duration_seconds=duration,
    )
