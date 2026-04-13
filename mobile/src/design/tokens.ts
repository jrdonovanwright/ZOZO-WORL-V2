/**
 * Design Tokens — single source of truth for every visual decision.
 *
 * Every color, size, duration, and radius in the app derives from this file.
 * No hardcoded values anywhere in the codebase.
 *
 * Cultural anchors: gold (royalty, celebration), royal purple (dignity),
 * earth tones (grounding, warmth), kente palette (heritage), rich skin
 * tone range (representation).
 */
import { Platform } from "react-native";

// ─── Color Palette ──────────────────────────────────────────────────────────

export const palette = {
  gold: {
    50: "#FFFBEB",
    100: "#FFF3C4",
    200: "#FCEA8A",
    300: "#F9DB52",
    400: "#F5C842",
    500: "#E6B800",
    600: "#CC9F00",
    700: "#A67C00",
    800: "#7A5C00",
    900: "#4D3A00",
  },
  royal: {
    50: "#F3EEFF",
    100: "#E0D4FF",
    200: "#C4AAFF",
    300: "#A37FFF",
    400: "#7B4FCC",
    500: "#5C2E9E",
    600: "#3D1A7A",
    700: "#2A1159",
    800: "#1A0A3A",
    900: "#0D051F",
  },
  earth: {
    50: "#FFF5EB",
    100: "#FFE4C4",
    200: "#FFCC8A",
    300: "#E6A55C",
    400: "#C4763A",
    500: "#A0522D",
    600: "#7A3A1A",
    700: "#5C2A10",
    800: "#3D1A0A",
    900: "#1F0D05",
  },
  kente: {
    red: "#CC2200",
    green: "#1A7A3A",
    blue: "#1A3A7A",
    gold: "#E6B800",
    black: "#1A1A1A",
  },
  sky: {
    50: "#EBF9FF",
    100: "#C4EEFF",
    200: "#8ADDFF",
    300: "#66D0F5",
    400: "#4FC4E6",
    500: "#2EA8CC",
    600: "#1A8AAA",
    700: "#106880",
    800: "#0A4A5C",
    900: "#052A35",
  },
  night: {
    50: "#E8E8F0",
    100: "#C4C4D4",
    200: "#9A9AB8",
    300: "#6A6A9A",
    400: "#3A3A6A",
    500: "#2A2A55",
    600: "#22224A",
    700: "#1A1A3A",
    800: "#12122A",
    900: "#0A0A1A",
  },
  cream: {
    50: "#FFF8E7",
    100: "#FFF0C4",
    200: "#FFE49A",
    300: "#FFD870",
    400: "#FFCC52",
    500: "#FFF8EE", // legacy "cream" base
  },
  mint: {
    50: "#EDFCF0",
    100: "#C4F5CC",
    200: "#8AEB99",
    300: "#6BCB77",
    400: "#4DAF5C",
    500: "#389444",
  },
  coral: {
    50: "#FFF0F0",
    100: "#FFD4D4",
    200: "#FFAAAA",
    300: "#FF8080",
    400: "#FF6B6B",
    500: "#E04545",
  },
  lavender: {
    50: "#F5F0FF",
    100: "#E8DDFF",
    200: "#D4C4FF",
    300: "#C9B8FF",
    400: "#B09EE6",
    500: "#9484CC",
  },
  peach: {
    50: "#FFF5EB",
    100: "#FFE4C4",
    200: "#FFD0A0",
    300: "#FFB347",
    400: "#F59A24",
    500: "#CC7A00",
  },

  // Skin tone range for character/avatar representation
  skin: {
    s1: "#FDDBB4",
    s2: "#EEC68A",
    s3: "#D4A574",
    s4: "#C68642",
    s5: "#A0522D",
    s6: "#7A3A1A",
    s7: "#5C2200",
    s8: "#3A1200",
  },

  // Pure neutrals
  white: "#FFFFFF",
  black: "#000000",
  transparent: "transparent",
} as const;

// ─── Semantic Colors ────────────────────────────────────────────────────────
// Maps purpose to palette tokens. Components use these, not palette directly.

export const colors = {
  // Surfaces
  background: palette.cream[50],
  surface: palette.white,
  surfaceElevated: palette.white,
  surfaceDim: palette.cream[100],

  // Text
  textPrimary: "#1A1A1A",
  textSecondary: "#5C5C5C",
  textMuted: "#AAAAAA",
  textOnDark: palette.white,
  textOnAccent: "#1A1A1A",

  // Brand
  primary: palette.gold[500],
  primaryLight: palette.gold[300],
  primaryDark: palette.gold[700],
  secondary: palette.royal[500],
  secondaryLight: palette.royal[300],
  accent: palette.sky[500],

  // Feedback — note: incorrect answers use warm amber, never harsh red
  success: palette.mint[300],
  successGlow: palette.mint[100],
  warning: palette.gold[400],
  error: palette.coral[400],
  incorrectWarm: palette.peach[300], // gentle amber for wrong answers
  incorrectGlow: palette.peach[100],

  // Zone themes
  zoneReading: palette.earth[400],
  zoneMath: palette.sky[400],
  zoneScience: palette.mint[300],
  zoneCulture: palette.peach[300],
  zoneSEL: palette.lavender[300],

  // Legacy compat (used by existing components via theme/index.ts)
  cream: palette.cream[50],
  sunflower: palette.gold[400],
  sky: palette.sky[400],
  coral: palette.coral[400],
  mint: palette.mint[300],
  lavender: palette.lavender[300],
  peach: palette.peach[300],
  charcoal: "#2D2D2D",
  softBlack: "#1A1A1A",
  white: palette.white,
  lightGray: "#F2F2F2",
  midGray: "#AAAAAA",
} as const;

// ─── Typography ─────────────────────────────────────────────────────────────
// Font families require assets in assets/fonts/ loaded via expo-font.
// Install: download from Google Fonts → assets/fonts/FredokaOne-Regular.ttf etc.

export const fontFamilies = {
  /** Display/headings — warm, rounded, child-appropriate */
  display: Platform.select({ ios: "Fredoka One", default: "FredokaOne-Regular" }),
  /** Body/UI — highly legible, friendly curves */
  body: Platform.select({ ios: "Nunito", default: "Nunito-Regular" }),
  bodyBold: Platform.select({ ios: "Nunito-Bold", default: "Nunito-Bold" }),
  /** Zoey speech bubbles — natural, handwritten feel */
  handwritten: Platform.select({ ios: "Patrick Hand", default: "PatrickHand-Regular" }),
  /** Numbers/scores — futuristic, gamified */
  mono: Platform.select({ ios: "Orbitron", default: "Orbitron-Regular" }),
} as const;

/**
 * Font assets map for expo-font loadAsync.
 *
 * Each require() is wrapped so the app doesn't crash if a font file is
 * missing. Download from Google Fonts and place in mobile/assets/fonts/:
 *   - FredokaOne-Regular.ttf
 *   - Nunito-Regular.ttf
 *   - Nunito-Bold.ttf
 *   - PatrickHand-Regular.ttf
 *   - Orbitron-Regular.ttf
 */
function safeFontRequire(path: string): any {
  try {
    switch (path) {
      case "FredokaOne-Regular":
        return require("../../assets/fonts/FredokaOne-Regular.ttf");
      case "Nunito-Regular":
        return require("../../assets/fonts/Nunito-Regular.ttf");
      case "Nunito-Bold":
        return require("../../assets/fonts/Nunito-Bold.ttf");
      case "PatrickHand-Regular":
        return require("../../assets/fonts/PatrickHand-Regular.ttf");
      case "Orbitron-Regular":
        return require("../../assets/fonts/Orbitron-Regular.ttf");
      default:
        return undefined;
    }
  } catch {
    return undefined;
  }
}

/** Build font asset map, skipping any missing files */
export function buildFontAssets(): Record<string, any> {
  const fonts: Record<string, any> = {};
  const names = [
    "FredokaOne-Regular",
    "Nunito-Regular",
    "Nunito-Bold",
    "PatrickHand-Regular",
    "Orbitron-Regular",
  ];
  for (const name of names) {
    const asset = safeFontRequire(name);
    if (asset) fonts[name] = asset;
  }
  return fonts;
}

/**
 * Typography tokens.
 *
 * fontFamily is NOT set here — it would crash the app if fonts haven't
 * loaded yet. Components that want custom fonts should apply fontFamily
 * explicitly after confirming fonts are loaded:
 *
 *   const fontsLoaded = useFontsLoaded();
 *   const style = fontsLoaded
 *     ? { ...typography.heading, fontFamily: fontFamilies.display }
 *     : typography.heading;
 */
export const typography = {
  // Child-facing — must be readable at arm's length on a tablet
  displayLarge: { fontSize: 48, fontWeight: "800" as const, lineHeight: 58 },
  displayMedium: { fontSize: 36, fontWeight: "800" as const, lineHeight: 44 },
  heading: { fontSize: 28, fontWeight: "700" as const, lineHeight: 36 },
  body: { fontSize: 22, fontWeight: "500" as const, lineHeight: 30 },
  caption: { fontSize: 16, fontWeight: "400" as const, lineHeight: 22 },
  speech: { fontSize: 22, fontWeight: "400" as const, lineHeight: 30 },
  score: { fontSize: 28, fontWeight: "700" as const, lineHeight: 36 },

  // Parent-facing — standard sizes
  parentHeading: { fontSize: 20, fontWeight: "600" as const, lineHeight: 28 },
  parentBody: { fontSize: 16, fontWeight: "400" as const, lineHeight: 24 },
  parentCaption: { fontSize: 13, fontWeight: "400" as const, lineHeight: 18 },
} as const;

// ─── Spacing (4pt base grid) ────────────────────────────────────────────────

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  huge: 96,
} as const;

// ─── Border Radius ──────────────────────────────────────────────────────────

export const radius = {
  none: 0,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
} as const;

// ─── Minimum Tap Targets ────────────────────────────────────────────────────

export const MIN_TAP_TARGET = 64;   // child-facing
export const MIN_TAP_TARGET_A11Y = 44; // WCAG AA minimum
