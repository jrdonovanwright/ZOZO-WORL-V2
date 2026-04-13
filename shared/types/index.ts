// Shared domain types — used by both mobile (TypeScript) and documented for backend (Python)
// Keep these in sync with backend Pydantic models.

export type SubjectId =
  | "reading"
  | "math"
  | "science"
  | "social_studies"
  | "sel"
  | "arts"
  | "health";

// Game engine types
export interface AnswerChoice {
  id: string;
  text: string;
  emoji?: string;
}

export interface GameQuestion {
  id: string;
  subject: SubjectId;
  level: number;
  type: "multiple_choice";
  prompt: string;
  choices: AnswerChoice[];
  correct_id: string;
  zoey_correct: string;
  zoey_wrong: string;
  scored: boolean;
  tts_prompt_url: string | null;
  tts_correct_url: string | null;
  tts_wrong_url: string | null;
}

export interface ChildProgress {
  subject_id: SubjectId;
  level: number;
  questions_answered: number;
  correct_count: number;
  accuracy_rate: number;
  last_played: string | null;
}

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
