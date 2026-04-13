/**
 * Offline session cache — mirrors activeSession to AsyncStorage on every
 * heartbeat so session resume works identically offline.
 *
 * Also caches the gptSystemPromptInsert so subsequent GPT-4o calls within
 * the session don't need to rebuild it.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ActiveSession } from "@/services/api/progression";
import type { SessionContextResponse } from "@/services/api/memory";

function sessionKey(childId: string): string {
  return `active_session:${childId}`;
}

function contextKey(childId: string): string {
  return `session_context:${childId}`;
}

function pendingSyncKey(childId: string): string {
  return `pending_offline_session:${childId}`;
}

// ── Active session cache ────────────────────────────────────────────────────

export async function getCachedSession(childId: string): Promise<ActiveSession | null> {
  try {
    const raw = await AsyncStorage.getItem(sessionKey(childId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setCachedSession(childId: string, session: ActiveSession): Promise<void> {
  try {
    await AsyncStorage.setItem(sessionKey(childId), JSON.stringify(session));
  } catch {
    // non-critical
  }
}

export async function clearCachedSession(childId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(sessionKey(childId));
  } catch {
    // non-critical
  }
}

// ── Session context cache (gptSystemPromptInsert) ───────────────────────────

export async function getCachedContext(childId: string): Promise<SessionContextResponse | null> {
  try {
    const raw = await AsyncStorage.getItem(contextKey(childId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setCachedContext(
  childId: string,
  context: SessionContextResponse,
): Promise<void> {
  try {
    await AsyncStorage.setItem(contextKey(childId), JSON.stringify(context));
  } catch {
    // non-critical
  }
}

// ── Pending offline session (for sync on reconnect) ─────────────────────────

export async function getPendingOfflineSession(
  childId: string,
): Promise<{ session: ActiveSession; skillUpdates: any[] } | null> {
  try {
    const raw = await AsyncStorage.getItem(pendingSyncKey(childId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setPendingOfflineSession(
  childId: string,
  session: ActiveSession,
  skillUpdates: any[] = [],
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      pendingSyncKey(childId),
      JSON.stringify({ session, skillUpdates }),
    );
  } catch {
    // non-critical
  }
}

export async function clearPendingOfflineSession(childId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(pendingSyncKey(childId));
  } catch {
    // non-critical
  }
}
