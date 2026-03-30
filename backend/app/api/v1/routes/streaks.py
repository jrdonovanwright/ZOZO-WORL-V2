"""
Streak API routes.

GET  /api/v1/streaks/{child_id}              — get current streak with computed status
POST /api/v1/streaks/{child_id}/record       — record today's activity
POST /api/v1/streaks/{child_id}/commentary   — generate Zoey streak commentary + TTS
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timezone

from fastapi import APIRouter, HTTPException, status

from app.models.streak import (
    RecordActivityRequest,
    StreakCommentaryRequest,
    StreakCommentaryResponse,
    StreakData,
    StreakResponse,
)
from app.services.ai.streak_commentator import generate_commentary
from app.services.firebase.firestore import get_streak, set_streak

logger = logging.getLogger(__name__)
router = APIRouter()


def _today() -> str:
    return date.today().isoformat()


def _days_since(last_active: str | None) -> int:
    if not last_active:
        return 999  # never played
    return (date.today() - date.fromisoformat(last_active)).days


def _compute_status(streak: StreakData) -> tuple[str, int]:
    """Return (streak_status, plant_stage) based on current date."""
    days = _days_since(streak.last_active_date)
    if days <= 1:
        streak_status = "active"
    else:
        streak_status = "at-risk"

    plant_stage = min(streak.current_streak, 7) if streak_status == "active" else max(min(streak.current_streak, 7) - 1, 0)
    return streak_status, plant_stage


@router.get(
    "/{child_id}",
    response_model=StreakResponse,
    summary="Get current streak with computed visual state",
)
async def fetch_streak(child_id: str) -> StreakResponse:
    raw = await get_streak(child_id)
    streak = StreakData(**(raw or {}))
    streak_status, plant_stage = _compute_status(streak)
    already_today = streak.last_active_date == _today()

    return StreakResponse(
        current_streak=streak.current_streak,
        longest_streak=streak.longest_streak,
        streak_status=streak_status,
        last_active_date=streak.last_active_date,
        plant_stage=plant_stage,
        already_recorded_today=already_today,
    )


@router.post(
    "/{child_id}/record",
    response_model=StreakResponse,
    summary="Record a learning activity for today",
)
async def record_activity(child_id: str, _req: RecordActivityRequest) -> StreakResponse:
    raw = await get_streak(child_id)
    streak = StreakData(**(raw or {}))
    today = _today()

    if streak.last_active_date == today:
        # Already recorded — return current state
        streak_status, plant_stage = _compute_status(streak)
        return StreakResponse(
            current_streak=streak.current_streak,
            longest_streak=streak.longest_streak,
            streak_status=streak_status,
            last_active_date=streak.last_active_date,
            plant_stage=plant_stage,
            already_recorded_today=True,
        )

    days_since = _days_since(streak.last_active_date)

    if days_since == 1:
        # Consecutive day — extend streak
        new_streak = streak.current_streak + 1
    else:
        # Gap of 2+ days — restart streak
        new_streak = 1

    longest = max(streak.longest_streak, new_streak)
    now_iso = datetime.now(timezone.utc).isoformat()

    updated = StreakData(
        current_streak=new_streak,
        last_active_date=today,
        longest_streak=longest,
        streak_status="active",
        updated_at=now_iso,
    )
    await set_streak(child_id, updated.model_dump())

    plant_stage = min(new_streak, 7)
    return StreakResponse(
        current_streak=new_streak,
        longest_streak=longest,
        streak_status="active",
        last_active_date=today,
        plant_stage=plant_stage,
        already_recorded_today=True,
    )


@router.post(
    "/{child_id}/commentary",
    response_model=StreakCommentaryResponse,
    summary="Generate Zoey's streak commentary with TTS",
)
async def streak_commentary(child_id: str, req: StreakCommentaryRequest) -> StreakCommentaryResponse:
    try:
        raw = await get_streak(child_id)
        streak = StreakData(**(raw or {}))
        return await generate_commentary(req, streak)
    except Exception:
        logger.exception("Streak commentary failed | child=%s", child_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Couldn't generate streak commentary.",
        )
