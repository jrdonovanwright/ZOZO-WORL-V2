"""
Firebase ID token verification — FastAPI dependency.

Mobile clients obtain a Firebase ID token after signing in with Firebase Auth
(email/password or Google). Every authenticated request must include:

    Authorization: Bearer <firebase-id-token>

This dependency decodes and verifies the token, returning a lightweight
VerifiedUser that routes can depend on. It never hits a database — the token
itself is the source of truth for identity.
"""
from __future__ import annotations

import asyncio
import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth
from pydantic import BaseModel

from app.services.firebase.client import get_firebase_app

logger = logging.getLogger(__name__)

_bearer = HTTPBearer(auto_error=True)


class VerifiedUser(BaseModel):
    uid: str
    email: str | None = None
    display_name: str | None = None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> VerifiedUser:
    """
    Verify the Firebase ID token from the Authorization header.

    Raises 401 if the token is missing, malformed, or expired.
    """
    get_firebase_app()  # ensure initialized before verifying

    token = credentials.credentials
    try:
        decoded = await asyncio.to_thread(auth.verify_id_token, token)
    except auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please sign in again.",
        )
    except auth.InvalidIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token.",
        )
    except Exception:
        logger.exception("Unexpected error verifying Firebase ID token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not verify credentials.",
        )

    return VerifiedUser(
        uid=decoded["uid"],
        email=decoded.get("email"),
        display_name=decoded.get("name"),
    )
