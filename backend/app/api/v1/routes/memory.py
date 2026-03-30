"""
Memory API routes — personal memory (Layer 1) and session context.

POST /api/v1/memory/update-personal         — extract + merge personal memory from transcript
POST /api/v1/memory/build-session-context    — unified context for session start
POST /api/v1/memory/memory-moment            — generate a memory-driven Zoey line
GET  /api/v1/memory/{child_id}               — read personal memory (parent dashboard)
DELETE /api/v1/memory/{child_id}/entry       — delete a specific memory entry (parent control)
DELETE /api/v1/memory/{child_id}/all         — wipe all personal memory (parent control)
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status

from app.models.memory import (
    BuildSessionContextRequest,
    DeleteMemoryEntryRequest,
    MemoryMomentRequest,
    MemoryMomentResponse,
    SessionContextResponse,
    UpdatePersonalMemoryRequest,
    ZoeyMemory,
)
from app.services.ai.memory_manager import (
    clear_all_memory,
    delete_memory_entry,
    get_or_create_memory,
    update_personal_memory,
)
from app.services.ai.memory_moment import generate_memory_moment
from app.services.ai.session_context_builder import build_session_context

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/update-personal",
    response_model=ZoeyMemory,
    summary="Extract personal details from session transcript and update memory",
)
async def update_memory(req: UpdatePersonalMemoryRequest) -> ZoeyMemory:
    try:
        return await update_personal_memory(req)
    except Exception:
        logger.exception("Memory update failed | child=%s", req.child_id)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Memory update failed.")


@router.post(
    "/build-session-context",
    response_model=SessionContextResponse,
    summary="Build unified session context with resume detection and GPT-4o prompt insert",
)
async def session_context(req: BuildSessionContextRequest) -> SessionContextResponse:
    try:
        return await build_session_context(req)
    except Exception:
        logger.exception("Session context build failed | child=%s", req.child_id)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Context build failed.")


@router.post(
    "/memory-moment",
    response_model=MemoryMomentResponse,
    summary="Generate a memory-driven Zoey line with TTS",
)
async def memory_moment(req: MemoryMomentRequest) -> MemoryMomentResponse:
    try:
        return await generate_memory_moment(req)
    except Exception:
        logger.exception("Memory moment failed | child=%s", req.child_id)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Memory moment failed.")


@router.get(
    "/{child_id}",
    response_model=ZoeyMemory,
    summary="Get personal memory for parent dashboard",
)
async def get_memory(child_id: str) -> ZoeyMemory:
    return await get_or_create_memory(child_id)


@router.delete(
    "/{child_id}/entry",
    response_model=ZoeyMemory,
    summary="Delete a specific memory entry (parent control)",
)
async def remove_entry(child_id: str, req: DeleteMemoryEntryRequest) -> ZoeyMemory:
    return await delete_memory_entry(child_id, req.field, req.index)


@router.delete(
    "/{child_id}/all",
    summary="Clear all personal memory (parent control)",
)
async def clear_memory(child_id: str) -> dict:
    await clear_all_memory(child_id)
    return {"status": "cleared"}
