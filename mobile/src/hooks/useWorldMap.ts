/**
 * useWorldMap — loads per-zone progress for the world map screen.
 *
 * Only fetches zone progress from Firebase. The greeting/recommendation
 * comes from useSessionResume's session context (which calls
 * /api/v1/memory/build-session-context). This avoids two competing
 * greeting systems firing on every launch.
 */
import { useEffect, useRef, useState } from "react";

import type { SubjectId } from "../../../shared/types";
import { fetchProgress } from "@/services/api/game";

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
  isLocked: boolean;
}

export interface UseWorldMapReturn {
  zones: ZoneState[];
  progressLoaded: boolean;
  /** Mark a zone as recommended (called by world map after session context resolves) */
  setRecommendedZone: (subjectId: string) => void;
}

export function useWorldMap(childId: string): UseWorldMapReturn {
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
  const [progressLoaded, setProgressLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const results = await Promise.allSettled(
        WORLD_ZONE_IDS.map((id) => fetchProgress(childId, id)),
      );

      if (cancelled) return;

      const updatedZones: ZoneState[] = WORLD_ZONE_IDS.map((id, i) => {
        const r = results[i];
        const p = r.status === "fulfilled" ? r.value : null;
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
    }

    load();
    return () => { cancelled = true; };
  }, [childId]);

  const setRecommendedZone = (subjectId: string) => {
    setZones((prev) =>
      prev.map((z) => ({ ...z, isRecommended: z.subjectId === subjectId })),
    );
  };

  return { zones, progressLoaded, setRecommendedZone };
}
