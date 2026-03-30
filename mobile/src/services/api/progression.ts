import { apiClient } from "./client";

export interface ActiveSession {
  session_id: string;
  session_status: "active" | "paused" | "complete";
  started_at: string;
  last_heartbeat: string;
  current_zone: string | null;
  current_skill_id: string | null;
  current_activity_type: string | null;
  current_activity_step: number;
  current_difficulty: number;
  questions_answered_this_skill: number;
  correct_this_skill: number;
  story_mode_state: any | null;
  session_mood: string | null;
  activities_completed_this_session: string[];
  skills_attempted_this_session: string[];
  skills_mastered_this_session: string[];
  zoey_asks_log: any[];
  offline_mode: boolean;
}

export interface ProgressionSummaryResponse {
  progression_state: any;
  skills_per_subject: Record<string, { mastered: number; in_progress: number; available: number; total: number }>;
  narrative: string;
  headline: string;
}

export const fetchActiveSession = async (childId: string): Promise<ActiveSession | null> => {
  const { data } = await apiClient.get<ActiveSession | null>(
    `/api/v1/progression/active-session/${childId}`,
  );
  return data;
};

export const startSession = async (
  childId: string,
  zone?: string,
  skillId?: string,
  activityType?: string,
): Promise<ActiveSession> => {
  const { data } = await apiClient.post<ActiveSession>(
    `/api/v1/progression/active-session/${childId}/start`,
    { child_id: childId, zone, skill_id: skillId, activity_type: activityType },
  );
  return data;
};

export const sendHeartbeat = async (
  childId: string,
  step: number,
  mood?: string,
): Promise<void> => {
  await apiClient.post(`/api/v1/progression/active-session/${childId}/heartbeat`, {
    current_activity_step: step,
    session_mood: mood,
  });
};

export const archiveSession = async (
  childId: string,
  partial = false,
): Promise<void> => {
  await apiClient.post(`/api/v1/progression/active-session/${childId}/archive`, {
    child_id: childId,
    partial,
  });
};

export const fetchProgressionSummary = async (
  childId: string,
  childName: string,
  childAge: number,
): Promise<ProgressionSummaryResponse> => {
  const { data } = await apiClient.get<ProgressionSummaryResponse>(
    `/api/v1/progression/summary/${childId}`,
    { params: { child_name: childName, child_age: childAge } },
  );
  return data;
};

export const assessAndAdvance = async (req: {
  child_id: string;
  subject: string;
  skill_id: string;
  responses: Array<{
    question_text: string;
    selected_answer: string;
    correct_answer: string;
    is_correct: boolean;
  }>;
}): Promise<any> => {
  const { data } = await apiClient.post("/api/v1/progression/assess-and-advance", req);
  return data;
};

export const syncOfflineSession = async (
  childId: string,
  sessionLog: ActiveSession,
  skillUpdates: any[] = [],
): Promise<void> => {
  await apiClient.post("/api/v1/progression/sync-offline", {
    child_id: childId,
    session_log: sessionLog,
    skill_updates: skillUpdates,
  });
};

export const resetProgress = async (childId: string): Promise<void> => {
  await apiClient.delete(`/api/v1/progression/reset/${childId}`);
};
