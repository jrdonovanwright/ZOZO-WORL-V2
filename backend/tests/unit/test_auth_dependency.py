"""Unit tests for the Firebase ID token verification dependency."""
from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException


@pytest.fixture(autouse=True)
def mock_firebase_app():
    with patch("app.core.auth.get_firebase_app"):
        yield


async def _call_get_current_user(token: str):
    from fastapi.security import HTTPAuthorizationCredentials
    from app.core.auth import get_current_user

    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    return await get_current_user(credentials=creds)


@pytest.mark.asyncio
async def test_valid_token_returns_verified_user():
    decoded = {"uid": "user-123", "email": "parent@example.com", "name": "Marcus"}

    with patch("app.core.auth.auth.verify_id_token", return_value=decoded):
        user = await _call_get_current_user("valid-token")

    assert user.uid == "user-123"
    assert user.email == "parent@example.com"
    assert user.display_name == "Marcus"


@pytest.mark.asyncio
async def test_token_without_email_or_name():
    decoded = {"uid": "anon-uid"}

    with patch("app.core.auth.auth.verify_id_token", return_value=decoded):
        user = await _call_get_current_user("valid-token")

    assert user.uid == "anon-uid"
    assert user.email is None
    assert user.display_name is None


@pytest.mark.asyncio
async def test_expired_token_raises_401():
    from firebase_admin.auth import ExpiredIdTokenError

    with patch("app.core.auth.auth.verify_id_token", side_effect=ExpiredIdTokenError("expired", cause=None)):
        with pytest.raises(HTTPException) as exc_info:
            await _call_get_current_user("expired-token")

    assert exc_info.value.status_code == 401
    assert "expired" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_invalid_token_raises_401():
    from firebase_admin.auth import InvalidIdTokenError

    with patch("app.core.auth.auth.verify_id_token", side_effect=InvalidIdTokenError("bad token")):
        with pytest.raises(HTTPException) as exc_info:
            await _call_get_current_user("garbage")

    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_unexpected_error_raises_401():
    with patch("app.core.auth.auth.verify_id_token", side_effect=RuntimeError("network timeout")):
        with pytest.raises(HTTPException) as exc_info:
            await _call_get_current_user("some-token")

    assert exc_info.value.status_code == 401
