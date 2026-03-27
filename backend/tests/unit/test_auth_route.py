"""Route-level tests for GET /api/v1/auth/me."""
from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.auth import VerifiedUser, get_current_user
from app.main import app
from app.models.user import ParentProfile

_NOW = datetime(2026, 3, 26, 12, 0, 0, tzinfo=timezone.utc)

_FAKE_PARENT = ParentProfile(
    uid="parent-uid-123",
    email="parent@example.com",
    display_name="Marcus",
    created_at=_NOW,
    updated_at=_NOW,
)


@pytest.fixture
async def client():
    app.dependency_overrides[get_current_user] = lambda: VerifiedUser(
        uid="parent-uid-123", email="parent@example.com", display_name="Marcus"
    )
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_me_returns_parent_profile(client):
    with patch("app.api.v1.routes.auth.db.get_or_create_parent", new=AsyncMock(return_value=_FAKE_PARENT)):
        resp = await client.get("/api/v1/auth/me")

    assert resp.status_code == 200
    data = resp.json()
    assert data["uid"] == "parent-uid-123"
    assert data["email"] == "parent@example.com"
    assert data["display_name"] == "Marcus"


@pytest.mark.asyncio
async def test_get_me_passes_claims_to_firestore(client):
    with patch("app.api.v1.routes.auth.db.get_or_create_parent", new=AsyncMock(return_value=_FAKE_PARENT)) as mock_db:
        await client.get("/api/v1/auth/me")

    mock_db.assert_called_once_with(
        uid="parent-uid-123",
        email="parent@example.com",
        display_name="Marcus",
    )
