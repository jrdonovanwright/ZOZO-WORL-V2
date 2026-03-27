"""
Zoey conversation service — the core of the app.

Orchestrates:
  1. Transcription  (Whisper, if audio input)
  2. Prompt assembly (character + subject + child context)
  3. GPT-4o inference
  4. TTS synthesis   (ElevenLabs, cached in Firebase Storage)

This module is intentionally stateless. Session state and history are passed
in by the caller; persistence happens at the API layer.
"""
from __future__ import annotations

import base64
import logging
from typing import Any

from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionMessageParam

from app.core.config import settings
from app.models.conversation import (
    AudioInput,
    ConversationRequest,
    ConversationResponse,
    ConversationTurn,
)
from app.services.ai import transcription
from app.services.ai.prompt_builder import build_system_prompt
from app.services.tts import elevenlabs_service as tts

logger = logging.getLogger(__name__)

_GPT_MODEL = "gpt-4o"

# Keep responses short — Zoey speaks in bursts, not paragraphs.
# Children's attention spans are short; brevity IS warmth here.
_MAX_TOKENS = 200


def _openai_client() -> AsyncOpenAI:
    return AsyncOpenAI(api_key=settings.openai_api_key)


def _build_messages(
    system_prompt: str,
    history: list[ConversationTurn],
    child_text: str,
) -> list[ChatCompletionMessageParam]:
    """Convert conversation history + current input into OpenAI message format."""
    messages: list[ChatCompletionMessageParam] = [
        {"role": "system", "content": system_prompt}
    ]

    for turn in history:
        openai_role = "assistant" if turn.role == "zoey" else "user"
        messages.append({"role": openai_role, "content": turn.text})

    messages.append({"role": "user", "content": child_text})
    return messages


async def _transcribe_input(req: ConversationRequest) -> str:
    """Return the child's text — transcribed from audio or passed through directly."""
    if isinstance(req.input, AudioInput):
        audio_bytes = base64.b64decode(req.input.audio_b64)
        return await transcription.transcribe(audio_bytes, req.input.mime_type)
    return req.input.text


async def _call_gpt4o(
    messages: list[ChatCompletionMessageParam],
) -> tuple[str, dict[str, Any]]:
    """
    Send messages to GPT-4o and return (response_text, usage_dict).

    Raises on API errors — let them propagate to the route handler.
    """
    response = await _openai_client().chat.completions.create(
        model=_GPT_MODEL,
        messages=messages,
        max_tokens=_MAX_TOKENS,
        temperature=0.85,  # warm and varied, but not unpredictable
    )

    zoey_text = response.choices[0].message.content or ""
    usage = response.usage.model_dump() if response.usage else {}
    return zoey_text.strip(), usage


async def handle_turn(req: ConversationRequest) -> ConversationResponse:
    """
    Process one conversation turn and return Zoey's response.

    Steps:
      1. Transcribe audio → child_text (or pass text through)
      2. Build system prompt from subject + child context
      3. Call GPT-4o
      4. Synthesize Zoey's response to audio (non-blocking failure)
      5. Return response
    """
    # 1. Transcription
    child_text = await _transcribe_input(req)
    if not child_text:
        # Whisper returned nothing — child was silent or audio was blank
        child_text = "..."
        logger.info("Empty transcript for child_id=%s — using silence placeholder", req.child_id)

    # 2. Prompt assembly
    system_prompt = build_system_prompt(req.subject_id, req.child_context)

    # 3. GPT-4o
    messages = _build_messages(system_prompt, req.history, child_text)
    zoey_text, usage = await _call_gpt4o(messages)

    logger.info(
        "Conversation turn | child_id=%s session=%s subject=%s tokens=%s",
        req.child_id,
        req.session_id,
        req.subject_id,
        usage.get("total_tokens"),
    )

    # 4. TTS (failures are soft — mobile degrades gracefully to text-only)
    audio_url = await tts.synthesize(zoey_text)
    if not audio_url:
        logger.warning("TTS unavailable for session=%s — returning text only", req.session_id)

    return ConversationResponse(
        transcript=child_text,
        zoey_text=zoey_text,
        audio_url=audio_url,
        usage=usage,
    )
