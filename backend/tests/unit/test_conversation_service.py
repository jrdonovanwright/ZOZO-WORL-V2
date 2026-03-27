"""Unit tests for the conversation orchestrator."""
from __future__ import annotations

import base64
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.models.conversation import (
    AudioInput,
    ChildContext,
    ConversationRequest,
    ConversationTurn,
    MasterySummary,
    TextInput,
)


def _make_request(input_type: str = "text", text: str = "I don't know") -> ConversationRequest:
    if input_type == "text":
        inp = TextInput(type="text", text=text)
    else:
        inp = AudioInput(type="audio", audio_b64=base64.b64encode(b"fake-audio").decode())

    return ConversationRequest(
        child_id="child-123",
        session_id="sess-456",
        subject_id="math",
        child_context=ChildContext(
            name="Amara",
            age=5,
            mastery_summary=MasterySummary(scores={"counting": 0.6}),
        ),
        history=[
            ConversationTurn(role="zoey", text="Let's count some stars!"),
            ConversationTurn(role="child", text="okay"),
        ],
        input=inp,
    )


@pytest.mark.asyncio
async def test_text_input_does_not_call_whisper():
    req = _make_request("text", "three")

    mock_usage = MagicMock()
    mock_usage.model_dump.return_value = {"total_tokens": 80}
    mock_choice = MagicMock()
    mock_choice.message.content = "Three! You got it! Let's count to four!"
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_response.usage = mock_usage

    with (
        patch("app.services.ai.conversation.transcription.transcribe") as mock_transcribe,
        patch("app.services.ai.conversation._call_gpt4o", new=AsyncMock(return_value=("Three! You got it!", {}))),
        patch("app.services.ai.conversation.tts.synthesize", new=AsyncMock(return_value="https://audio.url")),
    ):
        from app.services.ai.conversation import handle_turn
        response = await handle_turn(req)

    mock_transcribe.assert_not_called()
    assert response.transcript == "three"
    assert response.zoey_text == "Three! You got it!"
    assert response.audio_url == "https://audio.url"


@pytest.mark.asyncio
async def test_audio_input_calls_whisper():
    req = _make_request("audio")

    with (
        patch("app.services.ai.conversation.transcription.transcribe", new=AsyncMock(return_value="two")) as mock_transcribe,
        patch("app.services.ai.conversation._call_gpt4o", new=AsyncMock(return_value=("Two! Yes!!", {}))),
        patch("app.services.ai.conversation.tts.synthesize", new=AsyncMock(return_value="https://audio.url")),
    ):
        from app.services.ai.conversation import handle_turn
        response = await handle_turn(req)

    mock_transcribe.assert_called_once()
    assert response.transcript == "two"


@pytest.mark.asyncio
async def test_empty_transcript_uses_placeholder():
    req = _make_request("audio")

    with (
        patch("app.services.ai.conversation.transcription.transcribe", new=AsyncMock(return_value="")),
        patch("app.services.ai.conversation._call_gpt4o", new=AsyncMock(return_value=("That's okay, take your time!", {}))),
        patch("app.services.ai.conversation.tts.synthesize", new=AsyncMock(return_value=None)),
    ):
        from app.services.ai.conversation import handle_turn
        response = await handle_turn(req)

    assert response.transcript == "..."


@pytest.mark.asyncio
async def test_tts_failure_returns_text_with_null_audio():
    req = _make_request("text", "five")

    with (
        patch("app.services.ai.conversation._call_gpt4o", new=AsyncMock(return_value=("Five! That's my favorite number!", {}))),
        patch("app.services.ai.conversation.tts.synthesize", new=AsyncMock(return_value=None)),
    ):
        from app.services.ai.conversation import handle_turn
        response = await handle_turn(req)

    assert response.zoey_text == "Five! That's my favorite number!"
    assert response.audio_url is None


@pytest.mark.asyncio
async def test_history_is_mapped_to_openai_roles():
    """Verify zoey → assistant, child → user in the messages list."""
    req = _make_request("text", "I see three")
    captured_messages = []

    async def capture_gpt4o(messages):
        captured_messages.extend(messages)
        return ("Great!", {})

    with (
        patch("app.services.ai.conversation._call_gpt4o", new=capture_gpt4o),
        patch("app.services.ai.conversation.tts.synthesize", new=AsyncMock(return_value=None)),
    ):
        from app.services.ai.conversation import handle_turn
        await handle_turn(req)

    roles = [(m["role"], m["content"]) for m in captured_messages]
    assert roles[0][0] == "system"
    assert ("assistant", "Let's count some stars!") in roles
    assert ("user", "okay") in roles
    assert roles[-1] == ("user", "I see three")
