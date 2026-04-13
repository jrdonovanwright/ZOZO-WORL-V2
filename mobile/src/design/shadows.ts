/**
 * Shadow scale — 5 elevation levels with platform-specific props.
 *
 * Usage: <View style={shadows.md} />
 */
import { Platform, type ViewStyle } from "react-native";

function shadow(
  offsetY: number,
  blurRadius: number,
  opacity: number,
  elevation: number,
): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: blurRadius,
    },
    android: {
      elevation,
    },
    default: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: blurRadius,
      elevation,
    },
  }) as ViewStyle;
}

export const shadows = {
  /** Subtle — cards at rest */
  xs: shadow(1, 2, 0.04, 1),
  /** Default — floating UI */
  sm: shadow(2, 4, 0.06, 2),
  /** Elevated — modals, active cards */
  md: shadow(4, 8, 0.08, 4),
  /** High — drag items, overlays */
  lg: shadow(8, 16, 0.12, 8),
  /** Cinematic — celebration badges, hero elements */
  xl: shadow(12, 24, 0.18, 12),
} as const;

/** Colored glow for zone cards, buttons, etc. */
export function coloredGlow(color: string, radius = 12, opacity = 0.3): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: {
      elevation: 6,
    },
    default: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
  }) as ViewStyle;
}
