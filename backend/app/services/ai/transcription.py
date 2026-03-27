"""
Whisper speech-to-text via the OpenAI API.

Accepts raw audio bytes + MIME type; returns the transcribed string.
Children's speech can be noisy and halting — we pass a prompt hint to Whisper
to improve accuracy for common vocabulary used by Zoey.
"""
from __future__ import annotations

import io
import logging

from openai import AsyncOpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)

# Hint Whisper toward vocabulary likely to appear in conversations with Zoey.
# This is a soft prompt — it biases but does not restrict the transcript.
_WHISPER_PROMPT = (
    "A young child (age 4 to 6) is talking to their AI friend Zoey. "
    "The child may say things like: yes, no, I don't know, look, Zoey, "
    "help me, I see it, that one, again, more, stop, ready."
)

# Map MIME types to file extensions Whisper expects
_MIME_TO_EXT: dict[str, str] = {
    "audio/m4a": "m4a",
    "audio/mp4": "mp4",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/webm": "webm",
    "audio/ogg": "ogg",
}


def _client() -> AsyncOpenAI:
    return AsyncOpenAI(api_key=settings.openai_api_key)


async def transcribe(audio_bytes: bytes, mime_type: str = "audio/m4a") -> str:
    """
    Transcribe audio bytes to text using Whisper.

    Returns an empty string if the audio contains no speech.
    Raises on API errors.
    """
    ext = _MIME_TO_EXT.get(mime_type, "m4a")
    file_tuple = (f"audio.{ext}", io.BytesIO(audio_bytes), mime_type)

    response = await _client().audio.transcriptions.create(
        model="whisper-1",
        file=file_tuple,
        prompt=_WHISPER_PROMPT,
        language="en",
    )

    transcript = response.text.strip()
    logger.debug("Whisper transcript: %r", transcript)
    return transcript
