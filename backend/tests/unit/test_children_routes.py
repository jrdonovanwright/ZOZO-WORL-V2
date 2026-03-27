"""
Route-level tests for /api/v1/children.

Auth is bypassed via FastAPI's dependency override — we inject a fixed
VerifiedUser so these tests focus purely on route + Firestore logic.
"""
from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.auth import VerifiedUser, get_current_user
from app.main import app
from app.models.user import ChildProfile

_NOW = datetime(2026, 3, 26, 12, 0, 0, tzinfo=timezone.utc)

_PARENT_UID = "parent-uid-123"

_FAKE_CHILD = ChildProfile(
    id="child-abc",
    parent_id=_PARENT_UID,
    name="Amara",
    age=5,
    avatar_url=None,
    created_at=_NOW,
    updated_at=_NOW,
)


def _override_auth():
    """Dependency override — returns a fixed parent without touching Firebase."""
    return VerifiedUser(uid=_PARENT_UID, email="parent@example.com")


@pytest.fixture
def auth_client():
    """AsyncClient with the auth dependency overridden."""
    app.dependency_overrides[get_current_user] = _override_auth
    yield
    app.dependency_overrides.clear()


@pytest.fixture
async def client(auth_client):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


# ---------------------------------------------------------------------------
# POST /children
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_child_returns_201(client):
    with patch("app.api.v1.routes.children.db.create_child", new=AsyncMock(return_value=_FAKE_CHILD)):
        resp = await client.post("/api/v1/children", json={"name": "Amara", "age": 5})

    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Amara"
    assert data["age"] == 5
    assert data["parent_id"] == _PARENT_UID


@pytest.mark.asyncio
async def test_create_child_age_below_minimum_rejected(client):
    resp = await client.post("/api/v1/children", json={"name": "Baby", "age": 3})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_child_age_above_maximum_rejected(client):
    resp = await client.post("/api/v1/children", json={"name": "OlderKid", "age": 7})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_child_blank_name_rejected(client):
    resp = await client.post("/api/v1/children", json={"name": "   ", "age": 5})
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# GET /children
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_children_returns_array(client):
    with patch("app.api.v1.routes.children.db.list_children", new=AsyncMock(return_value=[_FAKE_CHILD])):
        resp = await client.get("/api/v1/children")

    assert resp.status_code == 200
    assert len(resp.json()) == 1


@pytest.mark.asyncio
async def test_list_children_empty_returns_empty_array(client):
    with patch("app.api.v1.routes.children.db.list_children", new=AsyncMock(return_value=[])):
        resp = await client.get("/api/v1/children")

    assert resp.status_code == 200
    assert resp.json() == []


# ---------------------------------------------------------------------------
# GET /children/{child_id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_child_found(client):
    with patch("app.api.v1.routes.children.db.get_child", new=AsyncMock(return_value=_FAKE_CHILD)):
        resp = await client.get("/api/v1/children/child-abc")

    assert resp.status_code == 200
    assert resp.json()["id"] == "child-abc"


@pytest.mark.asyncio
async def test_get_child_not_found_returns_404(client):
    with patch("app.api.v1.routes.children.db.get_child", new=AsyncMock(return_value=None)):
        resp = await client.get("/api/v1/children/nonexistent")

    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PATCH /children/{child_id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_patch_child_name(client):
    updated = _FAKE_CHILD.model_copy(update={"name": "Amara Joy"})
    with patch("app.api.v1.routes.children.db.update_child", new=AsyncMock(return_value=updated)):
        resp = await client.patch("/api/v1/children/child-abc", json={"name": "Amara Joy"})

    assert resp.status_code == 200
    assert resp.json()["name"] == "Amara Joy"


@pytest.mark.asyncio
async def test_patch_child_empty_body_returns_422(client):
    resp = await client.patch("/api/v1/children/child-abc", json={})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_patch_child_not_found_returns_404(client):
    with patch("app.api.v1.routes.children.db.update_child", new=AsyncMock(return_value=None)):
        resp = await client.patch("/api/v1/children/ghost", json={"age": 6})

    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /children/{child_id}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_delete_child_returns_204(client):
    with patch("app.api.v1.routes.children.db.delete_child", new=AsyncMock(return_value=True)):
        resp = await client.delete("/api/v1/children/child-abc")

    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_delete_child_not_found_returns_404(client):
    with patch("app.api.v1.routes.children.db.delete_child", new=AsyncMock(return_value=False)):
        resp = await client.delete("/api/v1/children/ghost")

    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Auth guard
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_unauthenticated_request_rejected():
    """Without the dependency override, a missing token should return 403."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        resp = await c.get("/api/v1/children")

    # HTTPBearer with auto_error=True returns 403 when no credentials are provided
    assert resp.status_code == 403
