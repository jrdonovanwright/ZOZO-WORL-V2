"""
Firestore data access layer.

Firebase Admin's Firestore client is synchronous. All public functions here
are async — they delegate blocking I/O to a thread pool via asyncio.to_thread
so they don't block FastAPI's event loop.

Collections:
  users/{uid}          — parent profiles
  children/{child_id}  — child profiles (child_id is a Firestore auto-ID)
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from firebase_admin import firestore

from app.models.user import ChildProfile, ParentProfile
from app.services.firebase.client import get_firebase_app

logger = logging.getLogger(__name__)

_USERS = "users"
_CHILDREN = "children"


def _db():
    get_firebase_app()
    return firestore.client()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _to_parent(uid: str, data: dict) -> ParentProfile:
    return ParentProfile(
        uid=uid,
        email=data.get("email"),
        display_name=data.get("display_name"),
        created_at=data["created_at"],
        updated_at=data["updated_at"],
    )


def _to_child(doc_id: str, data: dict) -> ChildProfile:
    return ChildProfile(
        id=doc_id,
        parent_id=data["parent_id"],
        name=data["name"],
        age=data["age"],
        avatar_url=data.get("avatar_url"),
        created_at=data["created_at"],
        updated_at=data["updated_at"],
    )


# ---------------------------------------------------------------------------
# Parent profile
# ---------------------------------------------------------------------------

def _sync_get_or_create_parent(
    uid: str,
    email: str | None,
    display_name: str | None,
) -> ParentProfile:
    db = _db()
    ref = db.collection(_USERS).document(uid)
    doc = ref.get()

    if doc.exists:
        return _to_parent(uid, doc.to_dict())

    now = _now()
    data = {
        "email": email,
        "display_name": display_name,
        "created_at": now,
        "updated_at": now,
    }
    ref.set(data)
    logger.info("Created parent profile uid=%s", uid)
    return _to_parent(uid, data)


async def get_or_create_parent(
    uid: str,
    email: str | None = None,
    display_name: str | None = None,
) -> ParentProfile:
    """Get the parent's profile, creating it on first access."""
    return await asyncio.to_thread(
        _sync_get_or_create_parent, uid, email, display_name
    )


# ---------------------------------------------------------------------------
# Child profiles
# ---------------------------------------------------------------------------

def _sync_create_child(parent_id: str, name: str, age: int) -> ChildProfile:
    db = _db()
    now = _now()
    data = {
        "parent_id": parent_id,
        "name": name,
        "age": age,
        "avatar_url": None,
        "created_at": now,
        "updated_at": now,
    }
    # auto-generate the child document ID
    _, ref = db.collection(_CHILDREN).add(data)
    return _to_child(ref.id, data)


async def create_child(parent_id: str, name: str, age: int) -> ChildProfile:
    """Create a new child profile under the given parent."""
    return await asyncio.to_thread(_sync_create_child, parent_id, name, age)


def _sync_list_children(parent_id: str) -> list[ChildProfile]:
    db = _db()
    docs = (
        db.collection(_CHILDREN)
        .where("parent_id", "==", parent_id)
        .order_by("created_at")
        .stream()
    )
    return [_to_child(doc.id, doc.to_dict()) for doc in docs]


async def list_children(parent_id: str) -> list[ChildProfile]:
    """Return all children belonging to the given parent, oldest first."""
    return await asyncio.to_thread(_sync_list_children, parent_id)


def _sync_get_child(child_id: str, parent_id: str) -> ChildProfile | None:
    db = _db()
    doc = db.collection(_CHILDREN).document(child_id).get()
    if not doc.exists:
        return None
    data = doc.to_dict()
    # Ownership check — never return another parent's child
    if data.get("parent_id") != parent_id:
        return None
    return _to_child(doc.id, data)


async def get_child(child_id: str, parent_id: str) -> ChildProfile | None:
    """Return a child profile if it exists and belongs to parent_id."""
    return await asyncio.to_thread(_sync_get_child, child_id, parent_id)


def _sync_update_child(
    child_id: str,
    parent_id: str,
    updates: dict,
) -> ChildProfile | None:
    db = _db()
    ref = db.collection(_CHILDREN).document(child_id)
    doc = ref.get()

    if not doc.exists:
        return None
    if doc.to_dict().get("parent_id") != parent_id:
        return None  # caller should treat as not found (don't leak existence)

    updates["updated_at"] = _now()
    ref.update(updates)

    updated = ref.get().to_dict()
    return _to_child(child_id, updated)


async def update_child(
    child_id: str,
    parent_id: str,
    updates: dict,
) -> ChildProfile | None:
    """
    Apply a partial update to a child profile.

    Returns None if the child does not exist or does not belong to parent_id.
    """
    return await asyncio.to_thread(_sync_update_child, child_id, parent_id, updates)


def _sync_delete_child(child_id: str, parent_id: str) -> bool:
    db = _db()
    ref = db.collection(_CHILDREN).document(child_id)
    doc = ref.get()

    if not doc.exists:
        return False
    if doc.to_dict().get("parent_id") != parent_id:
        return False

    ref.delete()
    logger.info("Deleted child profile child_id=%s parent_id=%s", child_id, parent_id)
    return True


async def delete_child(child_id: str, parent_id: str) -> bool:
    """
    Delete a child profile.

    Returns False if the child does not exist or does not belong to parent_id.
    """
    return await asyncio.to_thread(_sync_delete_child, child_id, parent_id)
