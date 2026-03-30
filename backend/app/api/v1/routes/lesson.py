"""
Micro-lesson API routes — Zoey Explains.

POST /api/v1/lesson/generate — generate a 60–90 s spoken lesson script for a skill node
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status

from app.models.lesson import GenerateLessonRequest, GenerateLessonResponse
from app.services.ai.lesson_generator import generate_lesson

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/generate",
    response_model=GenerateLessonResponse,
    summary="Generate Zoey's spoken micro-lesson for a skill node",
)
async def generate_lesson_route(req: GenerateLessonRequest) -> GenerateLessonResponse:
    try:
        return await generate_lesson(req)
    except Exception:
        logger.exception(
            "Lesson generation failed | skill=%s child=%s", req.skill_id, req.child_name
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Zoey couldn't prepare the lesson right now. Please try again.",
        )
