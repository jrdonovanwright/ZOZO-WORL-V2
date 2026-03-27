# Zoey's World v2 — CLAUDE.md

## Project Overview

Zoey's World is an AI-powered educational mobile app for Black children ages 4–6. The core experience centers on **Zoey**, an AI companion character who is a *friend*, not a teacher — she learns alongside the child, celebrates with them, and never talks down to them.

The app covers four subject areas:
- **Reading & Literacy** — phonics, sight words, storytelling
- **Math** — counting, patterns, early numeracy
- **Black History & Culture** — age-appropriate stories, figures, traditions, celebrations
- **Science & Nature** — curiosity-driven exploration, animals, weather, the body

**Primary users:** Children ages 4–6 (non-readers; voice-first interaction)
**Secondary users:** Parents/caregivers (dashboard, progress, subscriptions, scheduling)

---

## Stack

| Layer | Tech |
|---|---|
| Mobile | React Native (Expo) |
| Backend API | FastAPI (Python) |
| Database / Auth | Firebase (Firestore + Firebase Auth) |
| AI Conversation | OpenAI GPT-4o |
| Speech-to-Text | OpenAI Whisper |
| Text-to-Speech | ElevenLabs (Zoey's voice) |
| Payments | Stripe |
| Scheduling | Google Calendar API |
| Storage | Firebase Storage |

---

## Repo Structure

```
zoeys-world-v2/
├── mobile/          # React Native (Expo) app
├── backend/         # FastAPI Python server
├── shared/          # Shared types, constants, prompts
└── docs/            # Design decisions, ADRs, prompts
```

See each subdirectory for its own README.

---

## Design Principles

### For the child experience
- **Voice-first.** Every action a child can take must be accessible by voice. Text is supplementary.
- **Big, expressive visuals.** Large tap targets (min 64px), high-contrast colors, animated characters.
- **No dead ends.** If a child is stuck, Zoey notices and offers help — always forward momentum.
- **Celebrate effort, not just correctness.** Wrong answers get warmth and a hint, not a buzzer.
- **Short sessions.** Activities should complete in 3–7 minutes. No infinite scroll, no pressure.
- **Zoey is a friend.** She uses "we" language ("let's try this together"), has personality quirks, remembers things the child told her.

### For the parent/caregiver experience
- **Transparent progress.** Parents see what was covered and how the child responded.
- **Low friction.** Scheduling and subscription management should take under 60 seconds.
- **Trust-building.** Content decisions (especially Black history) should be explainable and intentional.

### For the codebase
- **Keep child-facing and admin-facing code clearly separated.** `/mobile/src/screens/child/` vs `/mobile/src/screens/parent/`.
- **All AI prompts live in `/shared/prompts/`.** Never inline system prompts in business logic.
- **Adaptive logic lives in the backend.** The mobile app is a display layer; decisions about what content to serve next belong to the API.
- **Zoey's personality is a first-class concern.** Any AI response that sounds robotic or clinical is a bug.

---

## Zoey — Character Guidelines

Zoey is a 6-year-old girl who is curious, warm, a little goofy, and endlessly encouraging. She:
- Uses simple vocabulary appropriate for ages 4–6
- Has catchphrases and recurring personality beats (TBD in `/docs/zoey-character.md`)
- Reacts emotionally — she gets excited, surprised, thoughtful
- Never uses shame or urgency as motivation
- Reflects Black cultural identity naturally, not performatively

Her voice is produced via ElevenLabs with a custom voice profile. Voice consistency is critical — do not swap the voice model without design review.

---

## Adaptive Learning

The backend tracks per-child:
- **Mastery scores** per skill/concept (0.0–1.0)
- **Session history** — what was attempted, response time, correctness
- **Engagement signals** — did they finish? replay? skip?

The progression engine uses this to:
- Select the next activity (not too hard, not too easy — aim for ~70% success rate)
- Adjust Zoey's scaffolding language
- Surface recommendations to parents

---

## Firebase Collections (top-level)

- `users` — parent/caregiver accounts
- `children` — child profiles (linked to parent)
- `sessions` — learning session records
- `progress` — per-child mastery scores per skill
- `content` — structured activity/lesson content

---

## Environment Variables

See `.env.example` in `mobile/` and `backend/`. Never commit real keys. Use Firebase secrets for production backend config.

Key variables:
- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID` (Zoey's voice)
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`
- `FIREBASE_SERVICE_ACCOUNT` (backend)
- `GOOGLE_CALENDAR_CLIENT_ID` / `_SECRET`

---

## Development Notes

- Run the backend with `uvicorn app.main:app --reload` from `/backend`
- Run the mobile app with `npx expo start` from `/mobile`
- Firebase emulators are encouraged for local dev: `firebase emulators:start`
- All AI features should be testable with mocked responses (no live API calls in unit tests)
- ElevenLabs calls are expensive — cache TTS output in Firebase Storage keyed by content hash

---

## Content Sensitivity

The Black history & culture subject area requires special care:
- Content is reviewed for age-appropriateness and accuracy
- Stories of struggle (slavery, civil rights) are handled with care — focus on resilience and humanity, not trauma
- Cultural celebrations and everyday Black joy are centered, not just historical pain
- No content goes live without review against `/docs/content-guidelines.md`
