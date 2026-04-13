import { apiClient } from "./client";

export interface TranscriptTurn {
  speaker: "zoey" | "child";
  text: string;
}

export interface FunnyMoment { description: string; date: string; }
export interface BigWin { skill_id: string; description: string; date: string; }
export interface FamilyMention { name: string; relationship: string; }

export interface ZoeyMemory {
  favorite_animal: string | null;
  favorite_color: string | null;
  interests: string[];
  funny_moments: FunnyMoment[];
  big_wins: BigWin[];
  current_goal: string | null;
  family_mentions: FamilyMention[];
  recent_topics: string[];
  personality_notes: string[];
  last_memory_update: string | null;
}

export interface SessionContextResponse {
  resume_session: boolean;
  resume_context: {
    case: 1 | 2 | 3;
    minutes_away?: number;
    session?: any;
  } | null;
  zoey_opening_script: string;
  recommended_zone: string;
  recommended_skill: string;
  session_personalization: {
    memory_reference: string;
    mood_adjustment: string;
    teacher_assignment: any | null;
  };
  gpt_system_prompt_insert: string;
  tts_url: string | null;
}

export interface MemoryMomentResponse {
  zoey_line: string;
  memory_used: string;
  tts_url: string | null;
}

export const updatePersonalMemory = async (
  childId: string,
  transcript: TranscriptTurn[],
  currentMemory: ZoeyMemory,
): Promise<ZoeyMemory> => {
  const { data } = await apiClient.post<ZoeyMemory>("/api/v1/memory/update-personal", {
    child_id: childId,
    session_transcript: transcript,
    current_memory: currentMemory,
  });
  return data;
};

export const buildSessionContext = async (
  childId: string,
  childName: string,
  childAge: number,
): Promise<SessionContextResponse> => {
  const { data } = await apiClient.post<SessionContextResponse>(
    "/api/v1/memory/build-session-context",
    { child_id: childId, child_name: childName, child_age: childAge },
  );
  return data;
};

export const fetchMemoryMoment = async (
  childId: string,
  currentActivity: string,
  lastSkillMastered?: string,
): Promise<MemoryMomentResponse> => {
  const { data } = await apiClient.post<MemoryMomentResponse>(
    "/api/v1/memory/memory-moment",
    { child_id: childId, current_activity: currentActivity, last_skill_mastered: lastSkillMastered },
  );
  return data;
};

export const fetchMemory = async (childId: string): Promise<ZoeyMemory> => {
  const { data } = await apiClient.get<ZoeyMemory>(`/api/v1/memory/${childId}`);
  return data;
};

export const deleteMemoryEntry = async (
  childId: string,
  field: string,
  index?: number,
): Promise<ZoeyMemory> => {
  const { data } = await apiClient.delete<ZoeyMemory>(`/api/v1/memory/${childId}/entry`, {
    data: { child_id: childId, field, index },
  });
  return data;
};

export const clearAllMemory = async (childId: string): Promise<void> => {
  await apiClient.delete(`/api/v1/memory/${childId}/all`);
};
