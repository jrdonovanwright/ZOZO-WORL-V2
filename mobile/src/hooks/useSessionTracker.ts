/**
 * useSessionTracker — manages the lifecycle of a child learning session.
 *
 * Mount this hook once in the child layout. It:
 *   1. Starts a new session on mount (or when childId changes)
 *   2. Fires the parent report when the app goes to background OR after
 *      SESSION_TIMEOUT_MS of continuous activity — whichever comes first
 *   3. Sends a push notification to the parent with the report summary
 *      (requires expo-notifications to be installed and permissions granted)
 *
 * The hook exposes recordZoneVisit + recordAnswer so game/lesson screens can
 * accumulate session data without importing the store directly.
 *
 * Install expo-notifications to enable push notifications:
 *   npx expo install expo-notifications
 */
import { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { useAuthStore } from "@/store/authStore";
import { useChildStore } from "@/store/childStore";
import { useSessionStore } from "@/store/sessionStore";
import { generateReport } from "@/services/api/reports";
import { recordActivity as apiRecordStreak } from "@/services/api/streaks";
import type { SubjectId } from "../../../shared/types";

const SESSION_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes

export function useSessionTracker() {
  const { user, parent } = useAuthStore();
  const { activeChild } = useChildStore();
  const { startSession, recordZoneVisit, recordAnswer, buildSessionLog, sessionId } =
    useSessionStore();

  const reportFiredRef = useRef(false);
  const streakRecordedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fire report ────────────────────────────────────────────────────────────

  const fireReport = useCallback(async () => {
    // Guard: only fire once per session, and only if we have meaningful data
    if (reportFiredRef.current) return;
    const log = buildSessionLog();
    if (log.zones_visited.length === 0) return;  // nothing happened — skip
    reportFiredRef.current = true;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    try {
      const result = await generateReport({
        session_id: sessionId,
        parent_uid: user?.uid ?? "dev-parent",
        child_name: activeChild?.name ?? "your child",
        parent_name: parent?.display_name ?? "there",
        session_log: log,
      });

      // ── Push notification (optional — requires expo-notifications) ─────────
      // Install with: npx expo install expo-notifications
      // Then uncomment the block below and handle permissions in app startup.
      //
      // try {
      //   const { scheduleNotificationAsync } =
      //     require("expo-notifications") as typeof import("expo-notifications");
      //   await scheduleNotificationAsync({
      //     content: {
      //       title: `${activeChild?.name ?? "Your child"}'s session is done! 🌟`,
      //       body: result.report.summary,
      //       data: { sessionId: result.session_id },
      //     },
      //     trigger: null,  // deliver immediately
      //   });
      // } catch {
      //   // notifications not available or not permitted — silent fail
      // }
    } catch {
      // Report is non-critical — never surface errors to the child
    }
  }, [sessionId, buildSessionLog, user, parent, activeChild]);

  // ── Session lifecycle ──────────────────────────────────────────────────────

  useEffect(() => {
    reportFiredRef.current = false;
    startSession();

    // 20-minute hard timeout
    timeoutRef.current = setTimeout(fireReport, SESSION_TIMEOUT_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [activeChild?.id]); // restart session when child switches

  // AppState listener — fire when app goes to background
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "background" || nextState === "inactive") {
        fireReport();
      }
    };

    const sub = AppState.addEventListener("change", handleAppState);
    return () => sub.remove();
  }, [fireReport]);

  // ── Exposed helpers ────────────────────────────────────────────────────────

  const trackZoneVisit = useCallback(
    (subjectId: SubjectId, level: number) => {
      recordZoneVisit(subjectId, `${subjectId}.level_${level}`);

      // Record streak on first zone visit of the session
      if (!streakRecordedRef.current) {
        streakRecordedRef.current = true;
        const childId = activeChild?.id ?? "dev-child";
        apiRecordStreak(childId).catch(() => {
          // Offline — useStreak handles pending sync
        });
      }
    },
    [recordZoneVisit, activeChild?.id],
  );

  const trackAnswer = useCallback(
    (opts: {
      subjectId: SubjectId;
      questionText: string;
      selectedAnswer: string;
      correctAnswer: string;
      isCorrect: boolean;
    }) => {
      recordAnswer(opts);
    },
    [recordAnswer],
  );

  return { trackZoneVisit, trackAnswer };
}
