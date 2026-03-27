from fastapi import APIRouter

from app.api.v1.routes import auth, children, conversation

router = APIRouter()

router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(children.router, prefix="/children", tags=["children"])
router.include_router(conversation.router, prefix="/conversation", tags=["conversation"])

# Future routes registered here as features are built:
# from app.api.v1.routes import sessions, content, progression, stripe, calendar
# router.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
# router.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
# router.include_router(content.router, prefix="/content", tags=["content"])
# router.include_router(progression.router, prefix="/progression", tags=["progression"])
# router.include_router(stripe.router, prefix="/stripe", tags=["stripe"])
# router.include_router(calendar.router, prefix="/calendar", tags=["calendar"])
