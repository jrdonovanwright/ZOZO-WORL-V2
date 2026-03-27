"""
ElevenLabs TTS — generates Zoey's voice audio.

All synthesis results are cached in Firebase Storage. The caller receives a
signed URL regardless of whether it was a cache hit or a fresh synthesis.
If the TTS call or upload fails, we return None and let the caller degrade
gracefully (the mobile app can display text without audio).
"""
from __future__ import annotations

import logging

from elevenlabs.client import AsyncElevenLabs
from elevenlabs import VoiceSettings

from app.core.config import settings
from app.services.firebase import storage as tts_cache

logger = logging.getLogger(__name__)

# Zoey's voice model — use the highest quality multilingual model
_VOICE_MODEL = "eleven_turbo_v2"

# Voice settings tuned for a warm, childlike delivery
_VOICE_SETTINGS = VoiceSettings(
    stability=0.55,       # some variation keeps her sounding natural, not robotic
    similarity_boost=0.80,
    style=0.35,           # some expressiveness without over-dramatizing
    use_speaker_boost=True,
)


def _client() -> AsyncElevenLabs:
    return AsyncElevenLabs(api_key=settings.elevenlabs_api_key)


async def synthesize(text: str) -> str | None:
    """
    Synthesize text to Zoey's voice and return a Firebase Storage signed URL.

    Returns None if synthesis or upload fails — callers must handle gracefully.
    """
    voice_id = settings.elevenlabs_voice_id
    if not voice_id:
        logger.warning("ELEVENLABS_VOICE_ID not set — TTS skipped")
        return None

    # Check cache first
    cached_url = tts_cache.get_cached_tts_url(text, voice_id)
    if cached_url:
        return cached_url

    try:
        audio_bytes = await _synthesize_from_api(text, voice_id)
    except Exception:
        logger.exception("ElevenLabs synthesis failed for text: %r", text[:60])
        return None

    try:
        url = tts_cache.upload_tts_audio(text, voice_id, audio_bytes)
    except Exception:
        logger.exception("Firebase Storage upload failed — TTS audio not cached")
        return None

    return url


async def _synthesize_from_api(text: str, voice_id: str) -> bytes:
    """Call ElevenLabs and collect the full audio response as bytes."""
    client = _client()
    audio_stream = await client.generate(
        text=text,
        voice=voice_id,
        model=_VOICE_MODEL,
        voice_settings=_VOICE_SETTINGS,
    )
    # collect async generator into bytes
    chunks: list[bytes] = []
    async for chunk in audio_stream:
        chunks.append(chunk)
    return b"".join(chunks)
