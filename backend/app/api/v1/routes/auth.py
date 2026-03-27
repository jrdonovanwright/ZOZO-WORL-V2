from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.auth import VerifiedUser, get_current_user
from app.models.user import ParentProfile
from app.services.firebase import firestore as db

router = APIRouter()


@router.get(
    "/me",
    response_model=ParentProfile,
    summary="Get (or create) the authenticated parent's profile",
)
async def get_me(user: VerifiedUser = Depends(get_current_user)) -> ParentProfile:
    """
    Returns the parent's Firestore profile.

    On the parent's very first request, the profile is created from their
    Firebase Auth claims (email, display name). Subsequent calls return the
    existing profile. This makes the endpoint safe to call at app startup
    without a separate registration step.
    """
    return await db.get_or_create_parent(
        uid=user.uid,
        email=user.email,
        display_name=user.display_name,
    )
