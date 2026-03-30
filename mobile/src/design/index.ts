/**
 * Design system barrel export.
 *
 * import { palette, colors, typography, spacing, shadows, spring } from "@/design";
 */
export {
  palette,
  colors,
  fontFamilies,
  buildFontAssets,
  typography,
  spacing,
  radius,
  MIN_TAP_TARGET,
  MIN_TAP_TARGET_A11Y,
} from "./tokens";

export { shadows, coloredGlow } from "./shadows";

export {
  duration,
  easing,
  timing,
  spring,
  idle,
  stagger,
} from "./animations";
