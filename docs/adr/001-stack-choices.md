# ADR 001 — Stack Choices

**Date:** 2026-03-26
**Status:** Accepted

## Context

Zoey's World v2 is a greenfield rebuild. We need to choose a stack that supports voice-first mobile UX, AI conversation, adaptive learning, and parent-facing subscription management.

## Decisions

### React Native (Expo) — mobile
- Single codebase for iOS and Android
- Expo managed workflow for faster iteration; eject if native modules require it
- expo-av for audio recording/playback (Whisper input, ElevenLabs output)

### FastAPI — backend
- Python is the natural home for OpenAI/ElevenLabs SDK integrations
- Async-first for handling audio streaming
- Pydantic for strict schema validation

### Firebase
- Auth: lowest-friction parent auth (email + Google sign-in)
- Firestore: flexible schema suits evolving content/progress data
- Storage: TTS audio caching, child asset uploads

### GPT-4o — conversation
- Best-in-class instruction-following for maintaining Zoey's character
- Multimodal for potential future image/activity input
- Function calling for structured activity responses

### Whisper — STT
- High accuracy on children's speech (better than browser STT)
- Runs via OpenAI API; may move to self-hosted if latency is an issue

### ElevenLabs — TTS
- Custom voice for Zoey that is consistent across all content
- Emotional range needed for Zoey's character
- Cache all generated audio in Firebase Storage to control costs

### Stripe — payments
- Industry standard, well-supported React Native SDK
- Handles subscriptions, trials, and family plans

## Consequences

- AI costs (GPT-4o + ElevenLabs) require careful caching strategy
- Whisper latency (~1–2s) means child voice input needs a clear "listening" UI state
- Firebase Firestore query limitations may require denormalization for progression queries
