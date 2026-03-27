"""Unit tests for the ElevenLabs TTS service."""
from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, patch, MagicMock


@pytest.fixture(autouse=True)
def set_voice_id(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.elevenlabs_voice_id", "test-voice-id")
    monkeypatch.setattr("app.core.config.settings.elevenlabs_api_key", "test-key")


@pytest.mark.asyncio
async def test_returns_cached_url_without_calling_elevenlabs():
    with (
        patch("app.services.tts.elevenlabs_service.tts_cache.get_cached_tts_url", return_value="https://cached.url/audio.mp3"),
        patch("app.services.tts.elevenlabs_service._synthesize_from_api") as mock_synth,
    ):
        from app.services.tts.elevenlabs_service import synthesize
        url = await synthesize("Hello Amara!")

    assert url == "https://cached.url/audio.mp3"
    mock_synth.assert_not_called()


@pytest.mark.asyncio
async def test_synthesizes_and_uploads_on_cache_miss():
    fake_audio = b"fake-mp3-bytes"
    with (
        patch("app.services.tts.elevenlabs_service.tts_cache.get_cached_tts_url", return_value=None),
        patch("app.services.tts.elevenlabs_service._synthesize_from_api", new=AsyncMock(return_value=fake_audio)),
        patch("app.services.tts.elevenlabs_service.tts_cache.upload_tts_audio", return_value="https://new.url/audio.mp3") as mock_upload,
    ):
        from app.services.tts.elevenlabs_service import synthesize
        url = await synthesize("Let's count together!")

    assert url == "https://new.url/audio.mp3"
    mock_upload.assert_called_once_with("Let's count together!", "test-voice-id", fake_audio)


@pytest.mark.asyncio
async def test_returns_none_when_synthesis_fails():
    with (
        patch("app.services.tts.elevenlabs_service.tts_cache.get_cached_tts_url", return_value=None),
        patch("app.services.tts.elevenlabs_service._synthesize_from_api", side_effect=Exception("ElevenLabs down")),
    ):
        from app.services.tts.elevenlabs_service import synthesize
        url = await synthesize("This will fail")

    assert url is None


@pytest.mark.asyncio
async def test_returns_none_when_voice_id_not_set(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.elevenlabs_voice_id", "")

    from app.services.tts.elevenlabs_service import synthesize
    url = await synthesize("No voice configured")

    assert url is None


@pytest.mark.asyncio
async def test_returns_none_when_upload_fails():
    with (
        patch("app.services.tts.elevenlabs_service.tts_cache.get_cached_tts_url", return_value=None),
        patch("app.services.tts.elevenlabs_service._synthesize_from_api", new=AsyncMock(return_value=b"audio")),
        patch("app.services.tts.elevenlabs_service.tts_cache.upload_tts_audio", side_effect=Exception("Storage down")),
    ):
        from app.services.tts.elevenlabs_service import synthesize
        url = await synthesize("Upload will fail")

    assert url is None
