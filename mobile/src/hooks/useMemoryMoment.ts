/**
 * useMemoryMoment — triggers a single memory-driven Zoey line once per
 * session at a natural pause (after completing a skill or between zones).
 *
 * Call `triggerIfReady(currentActivity, lastSkillMastered)` after skill
 * completion. The hook ensures it only fires once per session.
 */
import { useCallback, useRef, useState } from "react";
import { Audio } from "expo-av";

import { useChildStore } from "@/store/childStore";
import { fetchMemoryMoment, type MemoryMomentResponse } from "@/services/api/memory";

interface UseMemoryMomentReturn {
  /** The moment data (zoey_line + memory_used) if triggered */
  moment: MemoryMomentResponse | null;
  /** True while fetching the moment */
  loading: boolean;
  /** Call this at a natural pause — fires once per session */
  triggerIfReady: (currentActivity: string, lastSkillMastered?: string) => void;
}

export function useMemoryMoment(): UseMemoryMomentReturn {
  const activeChild = useChildStore((s) => s.activeChild);
  const childId = activeChild?.id ?? "dev-child";

  const [moment, setMoment] = useState<MemoryMomentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const firedRef = useRef(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  const triggerIfReady = useCallback(
    async (currentActivity: string, lastSkillMastered?: string) => {
      if (firedRef.current || loading) return;
      firedRef.current = true;
      setLoading(true);

      try {
        const result = await fetchMemoryMoment(childId, currentActivity, lastSkillMastered);
        setMoment(result);

        if (result.tts_url) {
          const { sound } = await Audio.Sound.createAsync(
            { uri: result.tts_url },
            { shouldPlay: true },
          );
          soundRef.current = sound;
          sound.setOnPlaybackStatusUpdate((s) => {
            if (s.isLoaded && s.didJustFinish) {
              sound.unloadAsync().catch(() => {});
              soundRef.current = null;
            }
          });
        }
      } catch {
        // Memory moment is non-critical — fail silently
      }

      setLoading(false);
    },
    [childId, loading],
  );

  return { moment, loading, triggerIfReady };
}
