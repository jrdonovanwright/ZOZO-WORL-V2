from fastapi import APIRouter

from app.api.v1.routes import (
    auth, challenges, children, conversation, game, lesson,
    memory, progression, reports, streaks, world,
)

router = APIRouter()

router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(children.router, prefix="/children", tags=["children"])
router.include_router(conversation.router, prefix="/conversation", tags=["conversation"])
router.include_router(game.router, prefix="/game", tags=["game"])
router.include_router(world.router, prefix="/world", tags=["world"])
router.include_router(lesson.router, prefix="/lesson", tags=["lesson"])
router.include_router(reports.router, prefix="/reports", tags=["reports"])
router.include_router(streaks.router, prefix="/streaks", tags=["streaks"])
router.include_router(challenges.router, prefix="/challenges", tags=["challenges"])
router.include_router(memory.router, prefix="/memory", tags=["memory"])
router.include_router(progression.router, prefix="/progression", tags=["progression"])

# Future routes:
# router.include_router(stripe.router, prefix="/stripe", tags=["stripe"])
# router.include_router(calendar.router, prefix="/calendar", tags=["calendar"])
