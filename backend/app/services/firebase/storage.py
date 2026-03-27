"""
Firebase Storage wrapper for TTS audio caching.

Cache key: SHA-256 of "{text}:{voice_id}" → stored at tts-cache/{hash}.mp3
Signed URLs are used so the bucket does not need to be public.
"""
from __future__ import annotations

import hashlib
import logging
from datetime import timedelta

from firebase_admin import storage

from app.services.firebase.client import get_firebase_app

logger = logging.getLogger(__name__)

_TTS_PREFIX = "tts-cache"
_SIGNED_URL_TTL = timedelta(hours=24)


def _tts_blob_name(text: str, voice_id: str) -> str:
    key = f"{text}:{voice_id}".encode()
    digest = hashlib.sha256(key).hexdigest()
    return f"{_TTS_PREFIX}/{digest}.mp3"


def get_bucket():
    get_firebase_app()  # ensure initialized
    return storage.bucket()


def get_cached_tts_url(text: str, voice_id: str) -> str | None:
    """Return a signed URL if this text has already been synthesized, else None."""
    blob_name = _tts_blob_name(text, voice_id)
    bucket = get_bucket()
    blob = bucket.blob(blob_name)

    if not blob.exists():
        return None

    url = blob.generate_signed_url(expiration=_SIGNED_URL_TTL, method="GET")
    logger.debug("TTS cache hit: %s", blob_name)
    return url


def upload_tts_audio(text: str, voice_id: str, audio_bytes: bytes) -> str:
    """Upload synthesized audio and return a signed URL."""
    blob_name = _tts_blob_name(text, voice_id)
    bucket = get_bucket()
    blob = bucket.blob(blob_name)

    blob.upload_from_string(audio_bytes, content_type="audio/mpeg")
    url = blob.generate_signed_url(expiration=_SIGNED_URL_TTL, method="GET")
    logger.debug("TTS audio uploaded: %s", blob_name)
    return url
