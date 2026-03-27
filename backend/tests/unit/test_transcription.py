"""Unit tests for the Whisper transcription service."""
from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.mark.asyncio
async def test_transcribe_returns_text():
    mock_response = MagicMock()
    mock_response.text = "  I see the cat  "

    with patch("app.services.ai.transcription._client") as mock_client_factory:
        mock_client = AsyncMock()
        mock_client.audio.transcriptions.create = AsyncMock(return_value=mock_response)
        mock_client_factory.return_value = mock_client

        from app.services.ai.transcription import transcribe
        result = await transcribe(b"fake-audio-bytes", "audio/m4a")

    assert result == "I see the cat"


@pytest.mark.asyncio
async def test_transcribe_empty_response_returns_empty_string():
    mock_response = MagicMock()
    mock_response.text = "   "

    with patch("app.services.ai.transcription._client") as mock_client_factory:
        mock_client = AsyncMock()
        mock_client.audio.transcriptions.create = AsyncMock(return_value=mock_response)
        mock_client_factory.return_value = mock_client

        from app.services.ai.transcription import transcribe
        result = await transcribe(b"silent-audio", "audio/wav")

    assert result == ""


@pytest.mark.asyncio
async def test_transcribe_unknown_mime_type_defaults_to_m4a():
    mock_response = MagicMock()
    mock_response.text = "hello"

    with patch("app.services.ai.transcription._client") as mock_client_factory:
        mock_client = AsyncMock()
        create_mock = AsyncMock(return_value=mock_response)
        mock_client.audio.transcriptions.create = create_mock
        mock_client_factory.return_value = mock_client

        from app.services.ai.transcription import transcribe
        await transcribe(b"bytes", "audio/unknown-format")

    call_kwargs = create_mock.call_args
    # The file tuple's extension should default to m4a
    file_arg = call_kwargs.kwargs.get("file") or call_kwargs.args[0]
    # file is passed as keyword argument
    assert call_kwargs.kwargs["file"][0] == "audio.m4a"
