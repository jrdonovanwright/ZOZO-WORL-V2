"""
Progression API routes — skill assessment, session lifecycle, and analytics.

GET  /api/v1/progression/summary/{child_id}                — full progression summary + narrative
POST /api/v1/progression/assess-and-advance                 — assess skill, update state, unlock next
POST /api/v1/progression/sync-offline                       — replay offline session into Firebase
GET  /api/v1/progression/active-session/{child_id}          — get active session for resume
POST /api/v1/progression/active-session/{child_id}/start    — start a new active session
POST /api/v1/progression/active-session/{child_id}/heartbeat — lightweight heartbeat update
POST /api/v1/progression/active-session/{child_id}/archive  — archive session to history
DELETE /api/v1/progression/reset/{child_id}                 — reset learning progress (parent control)
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status

from app.models.memory import (
    ActiveSession,
    ArchiveSessionRequest,
    AssessAndAdvanceRequest,
    AssessAndAdvanceResponse,
    HeartbeatRequest,
    ProgressionState,
    ProgressionSummaryResponse,
    SkillState,
    StartSessionRequest,
    SyncOfflineSessionRequest,
)
from app.services.ai.progression_narrator import generate_progression_summary
from app.services.firebase.memory_store import (
    delete_active_session,
    get_active_session,
    get_progression_state,
    get_skill,
    save_session_history,
    set_active_session,
    set_skill,
    update_active_session,
    update_progression_state,
    set_progression_state,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _session_id() -> str:
    return f"session_{int(datetime.now(timezone.utc).timestamp() * 1000)}"


# ── Progression summary ──────────────────────────────────────────────────────

@router.get(
    "/summary/{child_id}",
    response_model=ProgressionSummaryResponse,
    summary="Full progression summary with GPT-4o narrative",
)
async def progression_summary(child_id: str, child_name: str = "friend", child_age: int = 5):
    try:
        return await generate_progression_summary(child_id, child_name, child_age)
    except Exception:
        logger.exception("Progression summary failed | child=%s", child_id)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Progression summary failed.")


# ── Assess and advance ───────────────────────────────────────────────────────

MASTERY_THRESHOLD = 0.8
NEXT_LEVEL_MAP = {1: 2, 2: 3, 3: 4, 4: 5}


@router.post(
    "/assess-and-advance",
    response_model=AssessAndAdvanceResponse,
    summary="Assess skill activity, update state, and unlock next skill if mastered",
)
async def assess_and_advance(req: AssessAndAdvanceRequest) -> AssessAndAdvanceResponse:
    now = _now_iso()

    # Load current skill state
    raw = await get_skill(req.child_id, req.subject, req.skill_id)
    skill = SkillState(**(raw or {"status": "available", "unlocked_at": now}))

    # Update with new responses
    correct = sum(1 for r in req.responses if r.is_correct)
    skill.attempts += len(req.responses)
    skill.correct_attempts += correct
    skill.mastery_score = skill.correct_attempts / max(skill.attempts, 1)
    skill.last_attempt = now
    skill.status = "in-progress"

    # Extract misconceptions from wrong answers
    for r in req.responses:
        if not r.is_correct and r.correct_answer not in skill.misconceptions:
            skill.misconceptions.append(f"Chose '{r.selected_answer}' instead of '{r.correct_answer}'")
    # Cap misconceptions list
    skill.misconceptions = skill.misconceptions[-10:]

    # Check mastery
    next_unlocked = False
    next_skill_id = None
    if skill.mastery_score >= MASTERY_THRESHOLD and skill.attempts >= 5:
        skill.status = "mastered"
        skill.mastered_at = now

        # Determine next skill
        parts = req.skill_id.split(".level_")
        if len(parts) == 2:
            current_level = int(parts[1])
            next_level = NEXT_LEVEL_MAP.get(current_level)
            if next_level:
                next_skill_id = f"{req.subject}.level_{next_level}"
                next_raw = await get_skill(req.child_id, req.subject, next_skill_id)
                if not next_raw or next_raw.get("status") == "locked":
                    next_skill = SkillState(status="available", unlocked_at=now)
                    await set_skill(req.child_id, req.subject, next_skill_id, next_skill.model_dump())
                    next_unlocked = True

    await set_skill(req.child_id, req.subject, req.skill_id, skill.model_dump())

    # Update progression state
    raw_prog = await get_progression_state(req.child_id)
    progression = ProgressionState(**(raw_prog or {}))
    if skill.status == "mastered":
        progression.total_skills_mastered += 1
    progression.last_active_zone = req.subject
    progression.last_updated = now

    await set_progression_state(req.child_id, progression.model_dump())

    return AssessAndAdvanceResponse(
        skill_state=skill,
        progression_state=progression,
        next_skill_unlocked=next_unlocked,
        next_skill_id=next_skill_id,
    )


# ── Active session lifecycle ─────────────────────────────────────────────────

@router.get(
    "/active-session/{child_id}",
    summary="Get active session for resume check",
)
async def get_session(child_id: str):
    raw = await get_active_session(child_id)
    if not raw:
        return None
    return ActiveSession(**raw)


@router.post(
    "/active-session/{child_id}/start",
    response_model=ActiveSession,
    summary="Start a new active session",
)
async def start_session(child_id: str, req: StartSessionRequest) -> ActiveSession:
    now = _now_iso()
    session = ActiveSession(
        session_id=_session_id(),
        session_status="active",
        started_at=now,
        last_heartbeat=now,
        current_zone=req.zone,
        current_skill_id=req.skill_id,
        current_activity_type=req.activity_type,
    )
    await set_active_session(child_id, session.model_dump())
    return session


@router.post(
    "/active-session/{child_id}/heartbeat",
    summary="Lightweight heartbeat — only updates timestamp and step",
)
async def heartbeat(child_id: str, req: HeartbeatRequest) -> dict:
    updates = {"last_heartbeat": _now_iso(), "current_activity_step": req.current_activity_step}
    if req.session_mood:
        updates["session_mood"] = req.session_mood
    try:
        await update_active_session(child_id, updates)
    except Exception:
        logger.warning("Heartbeat write failed | child=%s (may not have active session)", child_id)
    return {"ok": True}


@router.post(
    "/active-session/{child_id}/archive",
    summary="Archive active session to history and clear it",
)
async def archive_session(child_id: str, req: ArchiveSessionRequest) -> dict:
    raw = await get_active_session(child_id)
    if not raw:
        return {"archived": False, "reason": "no_active_session"}

    session = ActiveSession(**raw)
    session.session_status = "complete"

    await save_session_history(child_id, session.session_id, session.model_dump())
    await delete_active_session(child_id)

    # Update progression state session count
    raw_prog = await get_progression_state(child_id)
    if raw_prog:
        prog = ProgressionState(**raw_prog)
        prog.total_sessions_completed += 1
        await set_progression_state(child_id, prog.model_dump())

    return {"archived": True, "session_id": session.session_id, "partial": req.partial}


# ── Offline sync ─────────────────────────────────────────────────────────────

@router.post(
    "/sync-offline",
    summary="Replay offline session data into Firebase",
)
async def sync_offline(req: SyncOfflineSessionRequest) -> dict:
    now = _now_iso()

    # Save the session to history
    session_data = req.session_log.model_dump()
    session_data["session_status"] = "complete"
    session_data["offline_mode"] = True
    await save_session_history(req.child_id, req.session_log.session_id, session_data)

    # Replay skill updates
    for update in req.skill_updates:
        subject = update.get("subject", "")
        skill_id = update.get("skill_id", "")
        if subject and skill_id:
            await set_skill(req.child_id, subject, skill_id, update.get("data", {}))

    # Clear active session if it matches
    raw = await get_active_session(req.child_id)
    if raw and raw.get("session_id") == req.session_log.session_id:
        await delete_active_session(req.child_id)

    # Update progression session count
    raw_prog = await get_progression_state(req.child_id)
    if raw_prog:
        prog = ProgressionState(**raw_prog)
        prog.total_sessions_completed += 1
        prog.last_updated = now
        await set_progression_state(req.child_id, prog.model_dump())

    return {"synced": True, "session_id": req.session_log.session_id}


# ── Parent control: reset ────────────────────────────────────────────────────

@router.delete(
    "/reset/{child_id}",
    summary="Reset learning progress (preserves personal memory)",
)
async def reset_progress(child_id: str) -> dict:
    await set_progression_state(child_id, ProgressionState().model_dump())
    await delete_active_session(child_id)
    # Note: skill documents remain but are effectively orphaned.
    # A full cleanup would iterate and delete all skill nodes.
    return {"reset": True, "child_id": child_id}
