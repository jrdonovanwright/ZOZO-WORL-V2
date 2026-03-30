"""
Weekly challenge API routes.

POST /api/v1/challenges/generate                        — generate (or return existing) weekly challenge
GET  /api/v1/challenges/{child_id}/current              — get current week's challenge
POST /api/v1/challenges/{child_id}/{week_id}/complete-step — mark a step as complete
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status

from app.models.challenge import (
    CompleteStepRequest,
    GenerateChallengeRequest,
    GenerateChallengeResponse,
    WeeklyChallenge,
)
from app.services.ai.challenge_generator import current_week_id, generate_challenge
from app.services.firebase.firestore import get_challenge, update_challenge

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/generate",
    response_model=GenerateChallengeResponse,
    summary="Generate a new weekly challenge (idempotent per week)",
)
async def generate_weekly_challenge(req: GenerateChallengeRequest) -> GenerateChallengeResponse:
    try:
        return await generate_challenge(req)
    except Exception:
        logger.exception(
            "Challenge generation failed | child=%s week=%s",
            req.child_id,
            current_week_id(),
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Couldn't generate the weekly challenge. Please try again.",
        )


@router.get(
    "/{child_id}/current",
    response_model=WeeklyChallenge,
    summary="Get the current week's challenge",
)
async def get_current_challenge(child_id: str) -> WeeklyChallenge:
    week_id = current_week_id()
    raw = await get_challenge(child_id, week_id)
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No challenge found for week {week_id}. POST /generate to create one.",
        )
    return WeeklyChallenge(**raw)


@router.post(
    "/{child_id}/{week_id}/complete-step",
    response_model=WeeklyChallenge,
    summary="Mark a challenge step as complete",
)
async def complete_step(
    child_id: str,
    week_id: str,
    req: CompleteStepRequest,
) -> WeeklyChallenge:
    raw = await get_challenge(child_id, week_id)
    if not raw:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Challenge not found.")

    challenge = WeeklyChallenge(**raw)
    now_iso = datetime.now(timezone.utc).isoformat()
    step_found = False

    for step in challenge.steps:
        if step.day == req.day and not step.completed:
            step.completed = True
            step.completed_at = now_iso
            step_found = True
            break

    if not step_found:
        # Step already completed or day not found — return current state
        return challenge

    # Check if all steps are complete
    all_done = all(s.completed for s in challenge.steps)
    if all_done and not challenge.completed_at:
        challenge.completed_at = now_iso

    await update_challenge(child_id, week_id, challenge.model_dump())
    return challenge
