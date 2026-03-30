/**
 * Offline cache for streak data.
 *
 * On API success → write to AsyncStorage.
 * On API failure → read from AsyncStorage (stale but present).
 * Pending `recordActivity` calls are flagged so the next successful
 * API connection can sync them.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StreakResponse } from "@/services/api/streaks";

function streakKey(childId: string): string {
  return `streak_cache:${childId}`;
}

function pendingKey(childId: string): string {
  return `streak_pending_record:${childId}`;
}

function commentaryPlayedKey(childId: string): string {
  return `streak_commentary_played:${childId}`;
}

// ── Streak cache ─────────────────────────────────────────────────────────────

export async function getCachedStreak(childId: string): Promise<StreakResponse | null> {
  try {
    const raw = await AsyncStorage.getItem(streakKey(childId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setCachedStreak(childId: string, data: StreakResponse): Promise<void> {
  try {
    await AsyncStorage.setItem(streakKey(childId), JSON.stringify(data));
  } catch {
    // non-critical
  }
}

// ── Pending record sync ──────────────────────────────────────────────────────

export async function hasPendingRecord(childId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(pendingKey(childId))) === "1";
  } catch {
    return false;
  }
}

export async function setPendingRecord(childId: string, pending: boolean): Promise<void> {
  try {
    if (pending) {
      await AsyncStorage.setItem(pendingKey(childId), "1");
    } else {
      await AsyncStorage.removeItem(pendingKey(childId));
    }
  } catch {
    // non-critical
  }
}

// ── Commentary throttle (play only once per session start per day) ────────────

export async function hasPlayedCommentaryToday(childId: string): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(commentaryPlayedKey(childId));
    return val === new Date().toISOString().slice(0, 10);
  } catch {
    return false;
  }
}

export async function markCommentaryPlayed(childId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(
      commentaryPlayedKey(childId),
      new Date().toISOString().slice(0, 10),
    );
  } catch {
    // non-critical
  }
}
