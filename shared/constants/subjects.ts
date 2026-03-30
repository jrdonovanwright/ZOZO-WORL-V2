import { SubjectId } from "../types";

export const SUBJECTS: Record<SubjectId, {
  id: SubjectId;
  label: string;
  emoji: string;
  colorKey: string;
  description: string;
  scored: boolean; // false for SEL and Arts — no right/wrong tracking
}> = {
  reading: {
    id: "reading",
    label: "Reading",
    emoji: "📖",
    colorKey: "sky",
    description: "Stories, letters & words",
    scored: true,
  },
  math: {
    id: "math",
    label: "Math",
    emoji: "🔢",
    colorKey: "sunflower",
    description: "Numbers, counting & shapes",
    scored: true,
  },
  science: {
    id: "science",
    label: "Science",
    emoji: "🔬",
    colorKey: "mint",
    description: "Animals, plants & the world",
    scored: true,
  },
  social_studies: {
    id: "social_studies",
    label: "Our World",
    emoji: "🌍",
    colorKey: "peach",
    description: "Community, culture & history",
    scored: true,
  },
  sel: {
    id: "sel",
    label: "Feelings",
    emoji: "💛",
    colorKey: "lavender",
    description: "Emotions, kindness & me",
    scored: false,
  },
  arts: {
    id: "arts",
    label: "Arts",
    emoji: "🎨",
    colorKey: "coral",
    description: "Colors, music & creativity",
    scored: false,
  },
  health: {
    id: "health",
    label: "Health",
    emoji: "🥦",
    colorKey: "mint",
    description: "Food, movement & feeling good",
    scored: true,
  },
};

// Display order for the home screen grid
export const SUBJECT_ORDER: SubjectId[] = [
  "reading",
  "math",
  "science",
  "social_studies",
  "sel",
  "arts",
  "health",
];
