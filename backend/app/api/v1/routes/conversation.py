from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status

from app.models.conversation import ConversationRequest, ConversationResponse
from app.services.ai.conversation import handle_turn

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/message",
    response_model=ConversationResponse,
    summary="Send a child message to Zoey and receive her response",
)
async def conversation_message(req: ConversationRequest) -> ConversationResponse:
    """
    Process one turn of a conversation with Zoey.

    - If `input.type` is `"audio"`, the audio is transcribed via Whisper before
      being sent to GPT-4o.
    - If `input.type` is `"text"`, the text is used directly.
    - Zoey's response is synthesized to audio via ElevenLabs (cached in Firebase
      Storage). If TTS is unavailable, `audio_url` will be `null` in the response —
      the mobile app must handle this gracefully.
    """
    try:
        return await handle_turn(req)
    except Exception as exc:
        logger.exception(
            "Conversation turn failed | child_id=%s session=%s",
            req.child_id,
            req.session_id,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Zoey is having trouble right now. Please try again.",
        ) from exc
