// Audio service — wraps expo-av for:
//   - Playing Zoey's TTS responses (streamed from ElevenLabs via backend)
//   - Recording child voice input (sent to Whisper via backend)
//   - Playing activity sounds and feedback chimes
//
// Key constraint: recording and playback are mutually exclusive.
// Always stop recording before playing, and vice versa.
