"""
World map API routes.

POST /api/v1/world/greeting  — generate Zoey's personalized session greeting
                               and zone recommendation for a child
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status

from app.models.world import WorldGreetingRequest, WorldGreetingResponse
from app.services.ai.world_greeter import generate_world_greeting

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/greeting",
    response_model=WorldGreetingResponse,
    summary="Generate Zoey's personalized world map greeting",
)
async def world_greeting(req: WorldGreetingRequest) -> WorldGreetingResponse:
    try:
        return await generate_world_greeting(req)
    except Exception:
        logger.exception(
            "World greeting failed | child=%s", req.child_id
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Zoey couldn't come up with a greeting right now. Please try again.",
        )
