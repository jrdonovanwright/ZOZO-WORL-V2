/**
 * useSessionResume — checks for an active session on app launch and
 * determines the appropriate resume case.
 *
 * Cases:
 *   1. Active + heartbeat within 30 min → "resume" (offer Keep Going / Start Fresh)
 *   2. Active + same day, >30 min → "resume-light" (lighter prompt)
 *   3. Active + previous day → "abandoned" (auto-archive, reference in greeting)
 *   4. No active session → "fresh" (standard start)
 *
 * The hook returns the case, context, and action handlers.
 */
import { useCallback, useEffect, useState } from "react";

import { useChildStore } from "@/store/childStore";
import {
  buildSessionContext,
  type SessionContextResponse,
} from "@/services/api/memory";
import {
  archiveSession,
  fetchActiveSession,
  startSession,
  type ActiveSession,
} from "@/services/api/progression";
import { setCachedContext } from "@/utils/sessionCache";

export type ResumeCase = "resume" | "resume-light" | "abandoned" | "fresh";

interface UseSessionResumeReturn {
  /** Which resume case applies */
  resumeCase: ResumeCase;
  /** The session context (greeting, prompt insert, recommendations) */
  context: SessionContextResponse | null;
  /** The active session to resume (cases 1 & 2 only) */
  activeSession: ActiveSession | null;
  /** True while checking resume state */
  loading: boolean;
  /** User chose "Keep Going" — restore session */
  keepGoing: () => void;
  /** User chose "Start Fresh" — archive + new session */
  startFresh: () => Promise<void>;
  /** Clear the resume prompt (after handling) */
  dismiss: () => void;
}

export function useSessionResume(): UseSessionResumeReturn {
  const activeChild = useChildStore((s) => s.activeChild);
  const childId = activeChild?.id ?? "dev-child";
  const childName = activeChild?.name ?? "friend";
  const childAge = activeChild?.age ?? 5;

  const [resumeCase, setResumeCase] = useState<ResumeCase>("fresh");
  const [context, setContext] = useState<SessionContextResponse | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        // Build session context — this checks activeSession server-side
        const ctx = await buildSessionContext(childId, childName, childAge);
        if (cancelled) return;

        setContext(ctx);
        await setCachedContext(childId, ctx);

        if (ctx.resume_session && ctx.resume_context) {
          const c = ctx.resume_context.case;
          if (c === 1) {
            setResumeCase("resume");
            setActiveSession(ctx.resume_context.session ?? null);
          } else if (c === 2) {
            setResumeCase("resume-light");
            setActiveSession(ctx.resume_context.session ?? null);
          } else {
            // Case 3 — auto-archive
            setResumeCase("abandoned");
            await archiveSession(childId, true);
          }
        } else {
          setResumeCase("fresh");
        }
      } catch {
        // Offline or API failure — start fresh
        setResumeCase("fresh");
      }

      if (!cancelled) setLoading(false);
    }

    check();
    return () => { cancelled = true; };
  }, [childId, childName, childAge]);

  const keepGoing = useCallback(() => {
    // The world map / game screen will use the activeSession to restore state
    setResumeCase("fresh"); // dismiss the prompt
  }, []);

  const startFresh = useCallback(async () => {
    if (activeSession) {
      await archiveSession(childId, true).catch(() => {});
    }
    await startSession(childId).catch(() => {});
    setActiveSession(null);
    setResumeCase("fresh");
  }, [childId, activeSession]);

  const dismiss = useCallback(() => {
    setResumeCase("fresh");
    setActiveSession(null);
  }, []);

  return { resumeCase, context, activeSession, loading, keepGoing, startFresh, dismiss };
}
