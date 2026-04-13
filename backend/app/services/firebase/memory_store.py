"""
Firestore data access for the Unified Memory System.

All child-specific memory data lives under children/{child_id}/:
  zoeyMemory/current          — personal memory (Layer 1)
  progressionState/current    — global progression (Layer 2A)
  skills/{subject}/{skillId}  — per-skill state (Layer 2B)
  activeSession/current       — active session (Layer 2C)
  sessions/{sessionId}        — session history (Layer 2D)

Same async pattern as firestore.py — sync helpers wrapped with asyncio.to_thread.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from firebase_admin import firestore

from app.services.firebase.client import get_firebase_app

logger = logging.getLogger(__name__)

_CHILDREN = "children"


def _db():
    get_firebase_app()
    return firestore.client()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─── Generic subcollection helpers ───────────────────────────────────────────

def _sync_get_doc(child_id: str, *path: str) -> dict | None:
    db = _db()
    ref = db.collection(_CHILDREN).document(child_id)
    for segment in path:
        ref = ref.collection(segment) if isinstance(ref, type(db.collection(""))) else ref
        # Build path segment by segment: collection/doc pairs
    # Rebuild path properly
    ref = db.collection(_CHILDREN).document(child_id)
    parts = list(path)
    while len(parts) >= 2:
        ref = ref.collection(parts.pop(0)).document(parts.pop(0))
    if parts:
        ref = ref.collection(parts[0]).document("current")
    doc = ref.get()
    return doc.to_dict() if doc.exists else None


def _sync_set_doc(child_id: str, data: dict, *path: str) -> None:
    db = _db()
    ref = db.collection(_CHILDREN).document(child_id)
    parts = list(path)
    while len(parts) >= 2:
        ref = ref.collection(parts.pop(0)).document(parts.pop(0))
    if parts:
        ref = ref.collection(parts[0]).document("current")
    ref.set(data)


def _sync_update_doc(child_id: str, updates: dict, *path: str) -> None:
    db = _db()
    ref = db.collection(_CHILDREN).document(child_id)
    parts = list(path)
    while len(parts) >= 2:
        ref = ref.collection(parts.pop(0)).document(parts.pop(0))
    if parts:
        ref = ref.collection(parts[0]).document("current")
    ref.update(updates)


def _sync_delete_doc(child_id: str, *path: str) -> None:
    db = _db()
    ref = db.collection(_CHILDREN).document(child_id)
    parts = list(path)
    while len(parts) >= 2:
        ref = ref.collection(parts.pop(0)).document(parts.pop(0))
    if parts:
        ref = ref.collection(parts[0]).document("current")
    ref.delete()


# ─── Layer 1: Personal Memory ────────────────────────────────────────────────

async def get_zoey_memory(child_id: str) -> dict | None:
    return await asyncio.to_thread(_sync_get_doc, child_id, "zoeyMemory")


async def set_zoey_memory(child_id: str, data: dict) -> None:
    await asyncio.to_thread(_sync_set_doc, child_id, data, "zoeyMemory")


# ─── Layer 2A: Progression State ─────────────────────────────────────────────

async def get_progression_state(child_id: str) -> dict | None:
    return await asyncio.to_thread(_sync_get_doc, child_id, "progressionState")


async def set_progression_state(child_id: str, data: dict) -> None:
    await asyncio.to_thread(_sync_set_doc, child_id, data, "progressionState")


async def update_progression_state(child_id: str, updates: dict) -> None:
    updates["last_updated"] = _now_iso()
    await asyncio.to_thread(_sync_update_doc, child_id, updates, "progressionState")


# ─── Layer 2B: Skill Tree ────────────────────────────────────────────────────

def _sync_get_skill(child_id: str, subject: str, skill_id: str) -> dict | None:
    db = _db()
    doc = (
        db.collection(_CHILDREN).document(child_id)
        .collection("skills").document(subject)
        .collection("nodes").document(skill_id)
        .get()
    )
    return doc.to_dict() if doc.exists else None


def _sync_set_skill(child_id: str, subject: str, skill_id: str, data: dict) -> None:
    db = _db()
    (
        db.collection(_CHILDREN).document(child_id)
        .collection("skills").document(subject)
        .collection("nodes").document(skill_id)
        .set(data)
    )


def _sync_list_skills(child_id: str, subject: str) -> list[dict]:
    db = _db()
    docs = (
        db.collection(_CHILDREN).document(child_id)
        .collection("skills").document(subject)
        .collection("nodes")
        .stream()
    )
    results = []
    for doc in docs:
        d = doc.to_dict()
        d["_id"] = doc.id
        results.append(d)
    return results


async def get_skill(child_id: str, subject: str, skill_id: str) -> dict | None:
    return await asyncio.to_thread(_sync_get_skill, child_id, subject, skill_id)


async def set_skill(child_id: str, subject: str, skill_id: str, data: dict) -> None:
    await asyncio.to_thread(_sync_set_skill, child_id, subject, skill_id, data)


async def list_skills(child_id: str, subject: str) -> list[dict]:
    return await asyncio.to_thread(_sync_list_skills, child_id, subject)


# ─── Layer 2C: Active Session ────────────────────────────────────────────────

async def get_active_session(child_id: str) -> dict | None:
    return await asyncio.to_thread(_sync_get_doc, child_id, "activeSession")


async def set_active_session(child_id: str, data: dict) -> None:
    await asyncio.to_thread(_sync_set_doc, child_id, data, "activeSession")


async def update_active_session(child_id: str, updates: dict) -> None:
    """Lightweight partial update — used by heartbeat."""
    await asyncio.to_thread(_sync_update_doc, child_id, updates, "activeSession")


async def delete_active_session(child_id: str) -> None:
    await asyncio.to_thread(_sync_delete_doc, child_id, "activeSession")


# ─── Layer 2D: Session History ───────────────────────────────────────────────

def _sync_save_session_history(child_id: str, session_id: str, data: dict) -> None:
    db = _db()
    (
        db.collection(_CHILDREN).document(child_id)
        .collection("sessions").document(session_id)
        .set(data)
    )
    logger.info("Archived session child=%s session=%s", child_id, session_id)


def _sync_list_sessions(child_id: str, limit: int) -> list[dict]:
    db = _db()
    docs = (
        db.collection(_CHILDREN).document(child_id)
        .collection("sessions")
        .order_by("started_at", direction=firestore.Query.DESCENDING)
        .limit(limit)
        .stream()
    )
    return [doc.to_dict() for doc in docs]


async def save_session_history(child_id: str, session_id: str, data: dict) -> None:
    await asyncio.to_thread(_sync_save_session_history, child_id, session_id, data)


async def list_sessions(child_id: str, limit: int = 20) -> list[dict]:
    return await asyncio.to_thread(_sync_list_sessions, child_id, limit)
