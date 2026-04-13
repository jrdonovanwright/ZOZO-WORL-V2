/**
 * useSessionHeartbeat — writes a lightweight heartbeat every 30 seconds
 * to both Firebase (via API) and AsyncStorage (for offline resume).
 *
 * Mount in the child layout. Only sends heartbeats while the child is
 * actively in a session (has visited at least one zone).
 */
import { useEffect, useRef } from "react";

import { useChildStore } from "@/store/childStore";
import { useSessionStore } from "@/store/sessionStore";
import { sendHeartbeat } from "@/services/api/progression";
import { setCachedSession } from "@/utils/sessionCache";

const HEARTBEAT_INTERVAL_MS = 30_000; // 30 seconds

export function useSessionHeartbeat() {
  const activeChild = useChildStore((s) => s.activeChild);
  const childId = activeChild?.id ?? "dev-child";
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepRef = useRef(0);

  const { zonesVisited, totalAnswers, sessionId } = useSessionStore();
  const isActive = zonesVisited.length > 0;

  useEffect(() => {
    if (!isActive) return;

    const tick = async () => {
      stepRef.current += 1;

      // Firebase heartbeat (lightweight — only timestamp + step)
      sendHeartbeat(childId, stepRef.current).catch(() => {
        // Offline — that's fine, AsyncStorage has the session
      });

      // AsyncStorage mirror for offline resume
      setCachedSession(childId, {
        session_id: sessionId,
        session_status: "active",
        started_at: new Date().toISOString(),
        last_heartbeat: new Date().toISOString(),
        current_zone: zonesVisited[zonesVisited.length - 1] ?? null,
        current_skill_id: null,
        current_activity_type: null,
        current_activity_step: stepRef.current,
        current_difficulty: 1,
        questions_answered_this_skill: totalAnswers,
        correct_this_skill: 0,
        story_mode_state: null,
        session_mood: null,
        activities_completed_this_session: [],
        skills_attempted_this_session: [],
        skills_mastered_this_session: [],
        zoey_asks_log: [],
        offline_mode: false,
      }).catch(() => {});
    };

    intervalRef.current = setInterval(tick, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, childId, sessionId, zonesVisited, totalAnswers]);
}
