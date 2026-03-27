// Shared domain types — used by both mobile (TypeScript) and documented for backend (Python)
// Keep these in sync with backend Pydantic models.

export type SubjectId = "reading" | "math" | "culture" | "science";

export interface ChildProfile {
  id: string;
  parentId: string;
  name: string;
  age: number; // 4–6
  avatarUrl?: string;
  createdAt: string; // ISO 8601
}

export interface MasteryScore {
  childId: string;
  subjectId: SubjectId;
  skillId: string;
  score: number; // 0.0–1.0
  updatedAt: string;
}

export interface Session {
  id: string;
  childId: string;
  subjectId: SubjectId;
  startedAt: string;
  endedAt?: string;
  activitiesCompleted: number;
  correctCount: number;
  totalCount: number;
  engagementSignals: EngagementSignals;
}

export interface EngagementSignals {
  replays: number;    // how many times child replayed audio
  skips: number;      // how many times child skipped
  earlyExit: boolean; // did child leave before activity finished
}

export interface Activity {
  id: string;
  subjectId: SubjectId;
  skillId: string;
  type: ActivityType;
  difficultyLevel: number; // 1–5
  content: Record<string, unknown>; // activity-type specific payload
}

export type ActivityType =
  | "listen_and_tap"    // Zoey says a word/number, child taps the matching image
  | "story_listen"      // Zoey tells a short story, comprehension check follows
  | "count_along"       // counting activity with visual objects
  | "rhyme_play"        // phonics / rhyming game
  | "culture_story"     // Black history/culture narrative
  | "science_explore"   // question + simple experiment prompt
  | "free_talk";        // open conversation with Zoey

export interface ZoeyMessage {
  role: "zoey" | "child";
  text: string;
  audioUrl?: string; // pre-cached ElevenLabs audio
  timestamp: string;
}
