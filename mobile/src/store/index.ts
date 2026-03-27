// Global state via Zustand
// Stores will be split by domain — do not create a single monolithic store.
//
// Planned stores:
//   useAuthStore       — parent auth state, Firebase user
//   useChildStore      — active child profile + mastery summary
//   useSessionStore    — current learning session state
//   useZoeyStore       — Zoey's current mood, last utterance, animation state
