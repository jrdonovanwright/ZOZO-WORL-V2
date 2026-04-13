/**
 * useConversation — the conversation state machine.
 *
 * States:
 *   idle      → waiting for the child to tap the mic
 *   listening → recording in progress
 *   thinking  → audio sent to backend, waiting for GPT-4o response
 *   speaking  → playing back Zoey's TTS audio
 *   error     → something went wrong; child can tap to retry
 *
 * History is accumulated in state and passed to the backend on each turn so
 * GPT-4o has full conversation context.
 */
import { useEffect, useRef, useState } from "react";
import { Audio } from "expo-av";

import {
  ConversationTurn,
  ConversationRequest,
  SubjectId,
  sendTurn,
} from "@/services/api/conversation";

export type ConversationStatus =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "error";

interface UseConversationOptions {
  childId: string;
  sessionId: string;
  subjectId: SubjectId;
  childName: string;
  childAge: number;
}

interface UseConversationReturn {
  status: ConversationStatus;
  currentZoeyText: string | null;
  history: ConversationTurn[];
  sendAudio: (base64: string, mimeType: string) => Promise<void>;
  setListening: (value: boolean) => void;
  clearError: () => void;
}

export function useConversation({
  childId,
  sessionId,
  subjectId,
  childName,
  childAge,
}: UseConversationOptions): UseConversationReturn {
  const [status, setStatus] = useState<ConversationStatus>("idle");
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [currentZoeyText, setCurrentZoeyText] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Unload sound on unmount
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const addTurns = (turns: ConversationTurn[]) => {
    setHistory((prev) => [...prev, ...turns]);
  };

  const playAudio = async (url: string) => {
    // Unload any previously playing sound
    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }

    setStatus("speaking");

    const { sound } = await Audio.Sound.createAsync(
      { uri: url },
      { shouldPlay: true },
    );
    soundRef.current = sound;

    sound.setOnPlaybackStatusUpdate((playbackStatus) => {
      if (playbackStatus.isLoaded && playbackStatus.didJustFinish) {
        setStatus("idle");
        sound.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    });
  };

  const sendAudio = async (base64: string, mimeType: string) => {
    setStatus("thinking");

    const request: ConversationRequest = {
      child_id: childId,
      session_id: sessionId,
      subject_id: subjectId,
      child_context: {
        name: childName,
        age: childAge,
        mastery_summary: { scores: {} },
        zoey_memories: [],
      },
      history,
      input: { type: "audio", audio_b64: base64, mime_type: mimeType },
    };

    try {
      const response = await sendTurn(request);

      addTurns([
        { role: "child", text: response.transcript },
        { role: "zoey", text: response.zoey_text },
      ]);
      setCurrentZoeyText(response.zoey_text);

      if (response.audio_url) {
        await playAudio(response.audio_url);
      } else {
        // ElevenLabs not configured — show text, return to idle
        setStatus("idle");
      }
    } catch {
      setStatus("error");
    }
  };

  const setListening = (value: boolean) => {
    setStatus(value ? "listening" : "idle");
  };

  const clearError = () => setStatus("idle");

  return { status, currentZoeyText, history, sendAudio, setListening, clearError };
}
