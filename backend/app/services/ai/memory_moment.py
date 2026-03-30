"""
Memory-Driven Moment — generates a single surprise Zoey line that
naturally references a personal memory during a session pause.
"""
from __future__ import annotations

import json
import logging
from functools import lru_cache
from pathlib import Path

from openai import AsyncOpenAI

from app.models.memory import MemoryMomentRequest, MemoryMomentResponse, ZoeyMemory
from app.services.firebase.memory_store import get_zoey_memory
from app.services.tts.elevenlabs_service import synthesize

logger = logging.getLogger(__name__)
_client = AsyncOpenAI()

PROMPTS_DIR = Path(__file__).parents[5] / "shared" / "prompts"


@lru_cache(maxsize=1)
def _load_prompt() -> str:
    return (PROMPTS_DIR / "memory" / "memory_moment.md").read_text()


async def generate_memory_moment(req: MemoryMomentRequest) -> MemoryMomentResponse:
    raw_memory = await get_zoey_memory(req.child_id)
    memory = ZoeyMemory(**(raw_memory or {}))

    # Skip if memory is too sparse to reference
    has_content = (
        memory.favorite_animal
        or memory.interests
        or memory.family_mentions
        or memory.big_wins
        or memory.funny_moments
    )
    if not has_content:
        return MemoryMomentResponse(
            zoey_line="You're doing amazing today!",
            memory_used="none",
            tts_url=None,
        )

    prompt = _load_prompt()
    user_msg = (
        f"currentActivity: {req.current_activity}\n"
        f"zoeyMemory: {json.dumps(memory.model_dump(), default=str)}\n"
        f"lastSkillMastered: {req.last_skill_mastered or 'none'}"
    )

    response = await _client.chat.completions.create(
        model="gpt-4o-2024-11-20",
        response_format={"type": "json_object"},
        temperature=0.9,
        max_tokens=150,
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": user_msg},
        ],
    )

    raw = json.loads(response.choices[0].message.content or "{}")
    zoey_line = raw.get("zoeyLine", "You're doing amazing today!")
    memory_used = raw.get("memoryUsed", "none")

    tts_url = await synthesize(zoey_line)

    return MemoryMomentResponse(
        zoey_line=zoey_line,
        memory_used=memory_used,
        tts_url=tts_url,
    )
