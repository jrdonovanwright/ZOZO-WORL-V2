"""
Personal Memory Manager — extracts personal details from session transcripts
and merges them into the child's persistent memory object.
"""
from __future__ import annotations

import json
import logging
from functools import lru_cache
from pathlib import Path

from openai import AsyncOpenAI

from app.models.memory import UpdatePersonalMemoryRequest, ZoeyMemory
from app.services.firebase.memory_store import get_zoey_memory, set_zoey_memory

logger = logging.getLogger(__name__)
_client = AsyncOpenAI()

PROMPTS_DIR = Path(__file__).parents[5] / "shared" / "prompts"


@lru_cache(maxsize=1)
def _load_prompt() -> str:
    return (PROMPTS_DIR / "memory" / "update_personal.md").read_text()


def _format_transcript(turns: list) -> str:
    return "\n".join(f"{t.speaker}: {t.text}" for t in turns)


async def update_personal_memory(req: UpdatePersonalMemoryRequest) -> ZoeyMemory:
    """Extract personal details from transcript and merge into stored memory."""
    prompt = _load_prompt()

    user_msg = (
        f"sessionTranscript:\n{_format_transcript(req.session_transcript)}\n\n"
        f"currentMemory:\n{req.current_memory.model_dump_json()}"
    )

    response = await _client.chat.completions.create(
        model="gpt-4o-2024-11-20",
        response_format={"type": "json_object"},
        temperature=0.3,  # low temp — factual extraction, not creative
        max_tokens=1200,
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": user_msg},
        ],
    )

    raw = json.loads(response.choices[0].message.content or "{}")
    updated = ZoeyMemory(**raw)

    await set_zoey_memory(req.child_id, updated.model_dump())
    return updated


async def get_or_create_memory(child_id: str) -> ZoeyMemory:
    """Load existing memory or return empty shell."""
    raw = await get_zoey_memory(child_id)
    if raw:
        return ZoeyMemory(**raw)
    return ZoeyMemory()


async def delete_memory_entry(child_id: str, field: str, index: int | None) -> ZoeyMemory:
    """Delete a specific entry from memory (parent control)."""
    memory = await get_or_create_memory(child_id)
    data = memory.model_dump()

    if field in data:
        if isinstance(data[field], list) and index is not None:
            if 0 <= index < len(data[field]):
                data[field].pop(index)
        else:
            data[field] = None if not isinstance(data[field], list) else []

    updated = ZoeyMemory(**data)
    await set_zoey_memory(child_id, updated.model_dump())
    return updated


async def clear_all_memory(child_id: str) -> None:
    """Wipe both personal memory layers completely."""
    await set_zoey_memory(child_id, ZoeyMemory().model_dump())
