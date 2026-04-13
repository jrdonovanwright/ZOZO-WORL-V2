/**
 * Tracks which skill-node lessons a child has already seen, so we don't
 * replay the same 90-second intro on every session.
 *
 * Key format:  lesson_seen:{childId}:{subjectId}:level_{level}
 * Value:       "1" (truthy string — AsyncStorage only stores strings)
 *
 * Scoped per child so siblings on the same device get their own lessons.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SubjectId } from "../../../shared/types";

function key(childId: string, subjectId: SubjectId, level: number): string {
  return `lesson_seen:${childId}:${subjectId}:level_${level}`;
}

export async function hasSeenLesson(
  childId: string,
  subjectId: SubjectId,
  level: number,
): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(key(childId, subjectId, level));
    return val === "1";
  } catch {
    return false; // on storage error, show the lesson rather than skip it
  }
}

export async function markLessonSeen(
  childId: string,
  subjectId: SubjectId,
  level: number,
): Promise<void> {
  try {
    await AsyncStorage.setItem(key(childId, subjectId, level), "1");
  } catch {
    // non-critical — worst case the lesson replays next session
  }
}
