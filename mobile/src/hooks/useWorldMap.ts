/**
 * useWorldMap — loads per-zone progress and Zoey's AI greeting for the world map screen.
 *
 * Load order:
 *  1. Fetch progress for all 5 zones in parallel (fast Firebase reads via game API)
 *  2. With that data, request Zoey's greeting + recommendation from GPT-4o
 *  3. Auto-play greeting TTS when audio URL arrives
 *
 * The map is shown immediately with progress data; the greeting animates in
 * once the AI responds (typically 2–4 seconds).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Audio } from "expo-av";

import type { SubjectId } from "../../../shared/types";
import { fetchProgress } from "@/services/api/game";
import {
  fetchWorldGreeting,
  progressToSummary,
  type WorldGreetingResponse,
} from "@/services/api/world";

// The five zones shown on the world map
export const WORLD_ZONE_IDS: SubjectId[] = [
  "reading",
  "math",
  "science",
  "social_studies",
  "sel",
];

export interface ZoneState {
  subjectId: SubjectId;
  level: number;
  questionsAnswered: number;
  accuracyRate: number;
  lastPlayed: string | null;
  isRecommended: boolean;
  /** Reserved for future gating logic — always false in the current release. */
  isLocked: boolean;
}

export interface UseWorldMapReturn {
  zones: ZoneState[];
  greeting: WorldGreetingResponse | null;
  progressLoaded: boolean;    // true once Firebase progress has been fetched
  greetingLoaded: boolean;    // true once AI greeting + TTS is ready
  replayGreeting: () => void; // let the child hear the greeting again
}

function getTimeOfDay(): "morning" | "afternoon" | "evening" {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

export function useWorldMap(
  childId: string,
  childName: string,
  childAge: number,
): UseWorldMapReturn {
  const [zones, setZones] = useState<ZoneState[]>(
    WORLD_ZONE_IDS.map((id) => ({
      subjectId: id,
      level: 1,
      questionsAnswered: 0,
      accuracyRate: 0,
      lastPlayed: null,
      isRecommended: false,
      isLocked: false,
    })),
  );
  const [greeting, setGreeting] = useState<WorldGreetingResponse | null>(null);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [greetingLoaded, setGreetingLoaded] = useState(false);

  const soundRef = useRef<Audio.Sound | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const playTts = useCallback(async (url: string) => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
      );
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((s) => {
        if (s.isLoaded && s.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          soundRef.current = null;
        }
      });
    } catch {
      // Audio unavailable — greeting still shown as text
    }
  }, []);

  const replayGreeting = useCallback(() => {
    if (greeting?.tts_url) playTts(greeting.tts_url);
  }, [greeting, playTts]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // ── Step 1: fetch all zone progress in parallel ──────────────────────
      const results = await Promise.allSettled(
        WORLD_ZONE_IDS.map((id) => fetchProgress(childId, id)),
      );

      if (cancelled) return;

      const progressList = results.map((r, i) =>
        r.status === "fulfilled" ? r.value : null,
      );

      const updatedZones: ZoneState[] = WORLD_ZONE_IDS.map((id, i) => {
        const p = progressList[i];
        return {
          subjectId: id,
          level: p?.level ?? 1,
          questionsAnswered: p?.questions_answered ?? 0,
          accuracyRate: p?.accuracy_rate ?? 0,
          lastPlayed: p?.last_played ?? null,
          isRecommended: false,
          isLocked: false,
        };
      });

      setZones(updatedZones);
      setProgressLoaded(true);

      // ── Step 2: fetch AI greeting with progress context ──────────────────
      const summaries = progressList
        .filter(Boolean)
        .map((p) => progressToSummary(p!));

      let greetingResp: WorldGreetingResponse;
      try {
        greetingResp = await fetchWorldGreeting({
          child_id: childId,
          child_name: childName,
          child_age: childAge,
          time_of_day: getTimeOfDay(),
          subject_progress: summaries,
        });
      } catch {
        // Greeting API failed — show map silently, no recommendation
        if (!cancelled) setGreetingLoaded(true);
        return;
      }

      if (cancelled) return;

      // Mark recommended zone
      const zonesWithRec = updatedZones.map((z) => ({
        ...z,
        isRecommended: z.subjectId === greetingResp.recommended_zone,
      }));
      setZones(zonesWithRec);
      setGreeting(greetingResp);
      setGreetingLoaded(true);

      // ── Step 3: auto-play greeting TTS ───────────────────────────────────
      if (greetingResp.tts_url && isMountedRef.current) {
        playTts(greetingResp.tts_url);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [childId, childName, childAge, playTts]);

  return { zones, greeting, progressLoaded, greetingLoaded, replayGreeting };
}
