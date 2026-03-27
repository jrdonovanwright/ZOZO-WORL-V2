import { SubjectId } from "../types";

export const SUBJECTS: Record<SubjectId, {
  id: SubjectId;
  label: string;
  emoji: string;
  colorKey: string; // maps to theme colors
  description: string;
}> = {
  reading: {
    id: "reading",
    label: "Reading",
    emoji: "📖",
    colorKey: "sky",
    description: "Stories, letters, and words",
  },
  math: {
    id: "math",
    label: "Math",
    emoji: "🔢",
    colorKey: "sunflower",
    description: "Numbers, counting, and patterns",
  },
  culture: {
    id: "culture",
    label: "Our Stories",
    emoji: "✊🏾",
    colorKey: "coral",
    description: "Black history, culture, and pride",
  },
  science: {
    id: "science",
    label: "Science",
    emoji: "🔬",
    colorKey: "mint",
    description: "How the world works",
  },
};
