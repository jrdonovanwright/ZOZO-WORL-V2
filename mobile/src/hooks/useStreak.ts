/**
 * useStreak — loads, caches, and manages the child's learning streak.
 *
 * On mount:
 *   1. Load cached streak instantly (fast paint)
 *   2. Fetch live streak from API (update cache on success)
 *   3. Sync any pending offline record
 *   4. Play Zoey's streak commentary TTS (once per day)
 *
 * Exposes `recordActivity()` for the session tracker to call when
 * the child visits their first zone of the day.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Audio } from "expo-av";

import {
  fetchStreak,
  fetchStreakCommentary,
  recordActivity as apiRecordActivity,
  type StreakResponse,
} from "@/services/api/streaks";
import {
  getCachedStreak,
  setCachedStreak,
  hasPendingRecord,
  setPendingRecord,
  hasPlayedCommentaryToday,
  markCommentaryPlayed,
} from "@/utils/streakCache";

function getTimeOfDay(): "morning" | "afternoon" | "evening" {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

interface UseStreakOptions {
  childId: string;
  childName: string;
}

interface UseStreakReturn {
  streak: StreakResponse | null;
  loading: boolean;
  commentary: string | null;
  recordActivity: () => Promise<void>;
}

export function useStreak({ childId, childName }: UseStreakOptions): UseStreakReturn {
  const [streak, setStreak] = useState<StreakResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentary, setCommentary] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const recordedRef = useRef(false);

  // ── Load streak on mount ──────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 1. Instant paint from cache
      const cached = await getCachedStreak(childId);
      if (cached && !cancelled) setStreak(cached);

      // 2. Live fetch
      try {
        // Sync pending record first
        if (await hasPendingRecord(childId)) {
          const synced = await apiRecordActivity(childId);
          await setPendingRecord(childId, false);
          await setCachedStreak(childId, synced);
          if (!cancelled) setStreak(synced);
        } else {
          const live = await fetchStreak(childId);
          await setCachedStreak(childId, live);
          if (!cancelled) setStreak(live);
        }
      } catch {
        // Offline — cached state is good enough
      }

      if (!cancelled) setLoading(false);

      // 3. Streak commentary (once per day)
      if (cancelled) return;
      try {
        const alreadyPlayed = await hasPlayedCommentaryToday(childId);
        if (alreadyPlayed) return;

        const { commentary: text, tts_url } = await fetchStreakCommentary(
          childId,
          childName,
          getTimeOfDay(),
        );
        if (cancelled) return;
        setCommentary(text);
        await markCommentaryPlayed(childId);

        if (tts_url) {
          const { sound } = await Audio.Sound.createAsync(
            { uri: tts_url },
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
        // Commentary is non-critical — fail silently
      }
    }

    load();
    return () => {
      cancelled = true;
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, [childId, childName]);

  // ── Record activity (called by session tracker) ───────────────────────────

  const recordActivity = useCallback(async () => {
    if (recordedRef.current) return;
    recordedRef.current = true;

    try {
      const updated = await apiRecordActivity(childId);
      await setCachedStreak(childId, updated);
      await setPendingRecord(childId, false);
      setStreak(updated);
    } catch {
      // Offline — flag for sync on next successful connection
      await setPendingRecord(childId, true);
      // Optimistic local update
      setStreak((prev) =>
        prev
          ? {
              ...prev,
              current_streak: prev.already_recorded_today
                ? prev.current_streak
                : prev.current_streak + 1,
              already_recorded_today: true,
              plant_stage: Math.min(
                (prev.already_recorded_today ? prev.current_streak : prev.current_streak + 1),
                7,
              ),
            }
          : prev,
      );
    }
  }, [childId]);

  return { streak, loading, commentary, recordActivity };
}
