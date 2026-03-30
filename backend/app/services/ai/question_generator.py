"""
Game question generator — produces structured multiple-choice questions via GPT-4o.

Flow:
  1. Load game system prompt + subject-specific prompt
  2. Call GPT-4o with JSON mode → structured question
  3. Synthesize TTS for prompt + correct/wrong feedback in parallel
  4. Return a complete GeneratedQuestion with TTS URLs

All prompt files live under shared/prompts/game/.
"""
from __future__ import annotations

import asyncio
import json
import logging
import uuid
from functools import lru_cache
from pathlib import Path

from openai import AsyncOpenAI

from app.core.config import settings
from app.models.game import AnswerChoice, GeneratedQuestion, GameSubjectId, QuestionRequest
from app.services.tts import elevenlabs_service as tts

logger = logging.getLogger(__name__)

_GPT_MODEL = "gpt-4o-2024-11-20"

_REPO_ROOT = Path(__file__).parents[4]
_GAME_PROMPTS_DIR = _REPO_ROOT / "shared" / "prompts" / "game"


@lru_cache(maxsize=None)
def _load_prompt(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    return "\n".join(l for l in lines if not l.startswith("# ")).strip()


def _system_prompt() -> str:
    return _load_prompt(_GAME_PROMPTS_DIR / "system.md")


def _subject_prompt(subject_id: str) -> str:
    path = _GAME_PROMPTS_DIR / f"{subject_id}.md"
    if not path.exists():
        logger.warning("No game prompt for subject %r", subject_id)
        return ""
    return _load_prompt(path)


def _is_scored(subject_id: GameSubjectId) -> bool:
    """SEL and Arts are exploratory — no right/wrong scoring."""
    return subject_id not in (GameSubjectId.sel, GameSubjectId.arts)


async def generate_question(req: QuestionRequest) -> GeneratedQuestion:
    """
    Generate a question for the given subject and difficulty level,
    synthesize TTS for all three audio clips, and return the full question.
    """
    system = "\n\n---\n\n".join(
        part for part in [_system_prompt(), _subject_prompt(req.subject_id.value)] if part
    )

    user_message = (
        f"Generate a {req.subject_id.value.replace('_', ' ')} question.\n"
        f"Child's name: {req.child_name}\n"
        f"Child's age: {req.child_age}\n"
        f"Difficulty level: {req.level} out of 5\n"
        f"Scored subject: {_is_scored(req.subject_id)}\n"
    )

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    response = await client.chat.completions.create(
        model=_GPT_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_message},
        ],
        response_format={"type": "json_object"},
        temperature=0.9,   # high variety keeps questions feeling fresh
        max_tokens=600,
    )

    raw = response.choices[0].message.content or "{}"
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        logger.error("GPT-4o returned invalid JSON for question: %s", raw[:200])
        raise ValueError("Question generation failed — invalid JSON from GPT-4o")

    choices = [
        AnswerChoice(
            id=c["id"],
            text=c["text"],
            emoji=c.get("emoji"),
        )
        for c in data.get("choices", [])
    ]

    question = GeneratedQuestion(
        id=str(uuid.uuid4()),
        subject=req.subject_id,
        level=req.level,
        prompt=data["prompt"],
        choices=choices,
        correct_id=data["correct_id"],
        zoey_correct=data["zoey_correct"],
        zoey_wrong=data["zoey_wrong"],
        scored=_is_scored(req.subject_id),
    )

    # Synthesize TTS for all three audio clips in parallel
    prompt_url, correct_url, wrong_url = await asyncio.gather(
        tts.synthesize(question.prompt),
        tts.synthesize(question.zoey_correct),
        tts.synthesize(question.zoey_wrong),
        return_exceptions=True,
    )

    question.tts_prompt_url = prompt_url if isinstance(prompt_url, str) else None
    question.tts_correct_url = correct_url if isinstance(correct_url, str) else None
    question.tts_wrong_url = wrong_url if isinstance(wrong_url, str) else None

    logger.info(
        "Question generated | subject=%s level=%d tts=%s",
        req.subject_id.value,
        req.level,
        "ok" if question.tts_prompt_url else "missing",
    )

    return question
