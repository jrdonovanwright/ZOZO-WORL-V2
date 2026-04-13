import { apiClient } from "./client";

// ---------------------------------------------------------------------------
// Types — mirror the backend Pydantic models exactly
// ---------------------------------------------------------------------------

export type SubjectId = "reading" | "math" | "culture" | "science" | "free_talk";

export interface ConversationTurn {
  role: "zoey" | "child";
  text: string;
}

export interface ConversationRequest {
  child_id: string;
  session_id: string;
  subject_id: SubjectId;
  child_context: {
    name: string;
    age: number;
    mastery_summary: { scores: Record<string, number> };
    zoey_memories: string[];
  };
  history: ConversationTurn[];
  input:
    | { type: "audio"; audio_b64: string; mime_type: string }
    | { type: "text"; text: string };
}

export interface ConversationResponse {
  transcript: string;
  zoey_text: string;
  audio_url: string | null;
  usage: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// API call
// ---------------------------------------------------------------------------

export const sendTurn = async (
  req: ConversationRequest,
): Promise<ConversationResponse> => {
  const { data } = await apiClient.post<ConversationResponse>(
    "/api/v1/conversation/message",
    req,
  );
  return data;
};
