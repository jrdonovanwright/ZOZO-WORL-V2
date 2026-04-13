"""
Game engine API routes.

POST /api/v1/game/question         — generate a question for a child at their current level
POST /api/v1/game/answer           — evaluate an answer and update progress
GET  /api/v1/game/progress/{child_id}/{subject_id} — fetch current level + stats
POST /api/v1/game/adjust-difficulty — AI advisor: analyze last 3 responses, return cue + level
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status

from app.models.game import (
    AnswerRequest,
    AnswerResponse,
    ChildProgress,
    DifficultyAdjustRequest,
    DifficultyAdjustResponse,
    GeneratedQuestion,
    QuestionRequest,
)
from app.services.ai.difficulty_advisor import adjust_difficulty
from app.services.ai.question_generator import generate_question
from app.services.game.progress_tracker import get_progress, record_answer

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/question",
    response_model=GeneratedQuestion,
    summary="Generate a game question for a child",
)
async def get_question(req: QuestionRequest) -> GeneratedQuestion:
    try:
        return await generate_question(req)
    except Exception:
        logger.exception(
            "Question generation failed | child=%s subject=%s level=%d",
            req.child_id, req.subject_id.value, req.level,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Zoey couldn't come up with a question right now. Please try again.",
        )


@router.post(
    "/answer",
    response_model=AnswerResponse,
    summary="Submit a child's answer and update progress",
)
async def submit_answer(req: AnswerRequest) -> AnswerResponse:
    try:
        is_correct = req.selected_id == req.correct_id
        _progress, new_level = await record_answer(req, is_correct)

        return AnswerResponse(
            is_correct=is_correct,
            new_level=new_level,
            accuracy_rate=_progress.accuracy_rate,
        )
    except Exception:
        logger.exception(
            "Answer submission failed | child=%s subject=%s",
            req.child_id, req.subject_id.value,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Couldn't save your answer. Please try again.",
        )


@router.get(
    "/progress/{child_id}/{subject_id}",
    response_model=ChildProgress,
    summary="Get a child's current progress for a subject",
)
async def fetch_progress(child_id: str, subject_id: str) -> ChildProgress:
    try:
        return await get_progress(child_id, subject_id)
    except Exception:
        logger.exception("Progress fetch failed | child=%s subject=%s", child_id, subject_id)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Couldn't load progress.")


@router.post(
    "/adjust-difficulty",
    response_model=DifficultyAdjustResponse,
    summary="AI advisor: analyze last 3 responses and return a coaching cue",
)
async def adjust_difficulty_route(req: DifficultyAdjustRequest) -> DifficultyAdjustResponse:
    try:
        return await adjust_difficulty(req)
    except Exception:
        logger.exception(
            "Difficulty adjustment failed | child=%s subject=%s",
            req.child_id, req.subject_id.value,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Couldn't evaluate difficulty right now.",
        )
