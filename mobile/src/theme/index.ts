// Design tokens for Zoey's World
// All child-facing UI uses these tokens — never raw hex values in components.

export const colors = {
  // Brand / backgrounds
  cream: "#FFF8EE",
  sunflower: "#FFD93D",
  sky: "#6EC6F5",
  coral: "#FF6B6B",
  mint: "#6BCB77",
  lavender: "#C9B8FF",
  peach: "#FFB347",

  // Neutrals
  charcoal: "#2D2D2D",
  softBlack: "#1A1A1A",
  white: "#FFFFFF",
  lightGray: "#F2F2F2",
  midGray: "#AAAAAA",

  // Feedback
  success: "#6BCB77",
  error: "#FF6B6B",
  warning: "#FFD93D",
} as const;

export const typography = {
  // Child-facing — must be readable at arm's length on a tablet
  displayLarge: { fontSize: 48, fontWeight: "800" as const, lineHeight: 58 },
  displayMedium: { fontSize: 36, fontWeight: "800" as const, lineHeight: 44 },
  heading: { fontSize: 28, fontWeight: "700" as const, lineHeight: 36 },
  body: { fontSize: 22, fontWeight: "500" as const, lineHeight: 30 },
  caption: { fontSize: 16, fontWeight: "400" as const, lineHeight: 22 },

  // Parent-facing — standard sizes
  parentHeading: { fontSize: 20, fontWeight: "600" as const, lineHeight: 28 },
  parentBody: { fontSize: 16, fontWeight: "400" as const, lineHeight: 24 },
  parentCaption: { fontSize: 13, fontWeight: "400" as const, lineHeight: 18 },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
} as const;

// Minimum tap target for child-facing buttons
export const MIN_TAP_TARGET = 64;
