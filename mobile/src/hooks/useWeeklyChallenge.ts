/**
 * useWeeklyChallenge — loads the current week's challenge, auto-generates
 * if one doesn't exist yet, and handles step completion.
 *
 * The hook auto-generates on Monday if no challenge exists for the week.
 * This works as a client-side fallback for the Firebase Cloud Function
 * that should ideally pre-generate challenges every Monday at midnight.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import {
  fetchCurrentChallenge,
  generateChallenge,
  completeStep as apiCompleteStep,
  type WeeklyChallenge,
} from "@/services/api/challenges";
import { gradeLevel } from "@/services/api/lesson";

interface UseWeeklyChallengeOptions {
  childId: string;
  childName: string;
  childAge: number;
  topWeakSkills?: string[];
  interests?: string[];
}

interface UseWeeklyChallengeReturn {
  challenge: WeeklyChallenge | null;
  loading: boolean;
  completedCount: number;
  totalSteps: number;
  isCompleted: boolean;
  completeStep: (day: string) => Promise<void>;
  /** Maps skill IDs from the session to matching challenge steps and completes them. */
  completeMatchingSteps: (skillsAttempted: string[]) => Promise<void>;
}

export function useWeeklyChallenge({
  childId,
  childName,
  childAge,
  topWeakSkills = [],
  interests = [],
}: UseWeeklyChallengeOptions): UseWeeklyChallengeReturn {
  const [challenge, setChallenge] = useState<WeeklyChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const generatingRef = useRef(false);

  // ── Load / auto-generate ──────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Try to fetch existing challenge for this week
        let data = await fetchCurrentChallenge(childId);

        // Auto-generate if none exists (client-side fallback for Cloud Function)
        if (!data && !generatingRef.current) {
          generatingRef.current = true;
          const result = await generateChallenge({
            child_id: childId,
            child_name: childName,
            grade_level: gradeLevel(childAge),
            top_weak_skills: topWeakSkills,
            interests,
          });
          data = result.challenge;
          generatingRef.current = false;
        }

        if (!cancelled) setChallenge(data);
      } catch {
        generatingRef.current = false;
        // Non-critical — world map still works without challenge
      }
      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [childId]);

  // ── Complete a specific step ──────────────────────────────────────────────

  const completeStep = useCallback(
    async (day: string) => {
      if (!challenge) return;
      try {
        const updated = await apiCompleteStep(childId, challenge.week_id, day);
        setChallenge(updated);
      } catch {
        // Fail silently — step completion is non-critical
      }
    },
    [childId, challenge],
  );

  // ── Match session skills against challenge steps ──────────────────────────

  const completeMatchingSteps = useCallback(
    async (skillsAttempted: string[]) => {
      if (!challenge) return;
      const skillSet = new Set(skillsAttempted);

      for (const step of challenge.steps) {
        if (!step.completed && skillSet.has(step.skill_id)) {
          await completeStep(step.day);
        }
      }
    },
    [challenge, completeStep],
  );

  const completedCount = challenge?.steps.filter((s) => s.completed).length ?? 0;
  const totalSteps = challenge?.steps.length ?? 5;
  const isCompleted = challenge?.completed_at !== null && challenge?.completed_at !== undefined;

  return {
    challenge,
    loading,
    completedCount,
    totalSteps,
    isCompleted,
    completeStep,
    completeMatchingSteps,
  };
}
