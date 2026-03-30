"""
Firebase progress tracker for the game engine.

Reads and writes per-child, per-subject progress documents at:
  children/{child_id}/progress/{subject_id}

All Firestore I/O is wrapped in asyncio.to_thread to avoid blocking
FastAPI's event loop.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from firebase_admin import firestore

from app.models.game import AnswerRequest, ChildProgress, GameSubjectId
from app.services.firebase.client import get_firebase_app
from app.services.game.difficulty_engine import compute_new_level, should_evaluate

logger = logging.getLogger(__name__)


def _db():
    get_firebase_app()
    return firestore.client()


def _progress_ref(child_id: str, subject_id: str):
    return _db().collection("children").document(child_id).collection("progress").document(subject_id)


def _get_progress_sync(child_id: str, subject_id: str) -> ChildProgress:
    doc = _progress_ref(child_id, subject_id).get()
    if not doc.exists:
        return ChildProgress(subject_id=GameSubjectId(subject_id))
    data = doc.to_dict()
    return ChildProgress(
        subject_id=GameSubjectId(subject_id),
        level=data.get("level", 1),
        questions_answered=data.get("questions_answered", 0),
        correct_count=data.get("correct_count", 0),
        accuracy_rate=data.get("accuracy_rate", 0.0),
        last_played=data.get("last_played"),
    )


def _record_answer_sync(
    req: AnswerRequest, is_correct: bool
) -> tuple[ChildProgress, int | None]:
    """
    Update progress and evaluate difficulty. Returns (updated_progress, new_level).
    new_level is None if no difficulty change occurred.
    """
    ref = _progress_ref(req.child_id, req.subject_id.value)
    doc = ref.get()
    existing = doc.to_dict() if doc.exists else {}

    questions_answered = existing.get("questions_answered", 0) + 1
    correct_count = existing.get("correct_count", 0) + (1 if is_correct else 0)
    accuracy_rate = correct_count / questions_answered
    current_level = existing.get("level", req.level)

    # Evaluate difficulty at each window checkpoint
    new_level: int | None = None
    if req.scored and should_evaluate(req.session_question_count):
        candidate = compute_new_level(
            req.session_correct_count,
            req.session_question_count,
            current_level,
        )
        if candidate != current_level:
            new_level = candidate
            current_level = candidate
            logger.info(
                "Difficulty adjusted | child=%s subject=%s level=%s→%s",
                req.child_id, req.subject_id.value, existing.get("level", 1), new_level,
            )

    ref.set(
        {
            "level": current_level,
            "questions_answered": questions_answered,
            "correct_count": correct_count,
            "accuracy_rate": accuracy_rate,
            "last_played": datetime.now(timezone.utc),
        },
        merge=True,
    )

    progress = ChildProgress(
        subject_id=req.subject_id,
        level=current_level,
        questions_answered=questions_answered,
        correct_count=correct_count,
        accuracy_rate=accuracy_rate,
        last_played=datetime.now(timezone.utc),
    )
    return progress, new_level


# ---------------------------------------------------------------------------
# Public async API
# ---------------------------------------------------------------------------

async def get_progress(child_id: str, subject_id: str) -> ChildProgress:
    return await asyncio.to_thread(_get_progress_sync, child_id, subject_id)


async def record_answer(req: AnswerRequest, is_correct: bool) -> tuple[ChildProgress, int | None]:
    return await asyncio.to_thread(_record_answer_sync, req, is_correct)
