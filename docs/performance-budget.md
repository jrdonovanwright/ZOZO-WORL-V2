# Performance Budget & Audit Checklist — Zoey's World v2

## Target Devices
- **Low end:** 3-year-old mid-range Android (Samsung A13, Moto G Power)
- **Mid tier:** iPhone SE 3rd gen, Pixel 6a
- **High end:** iPhone 14+, Pixel 8

All budgets must pass on the **low end** device.

---

## Performance Budgets

| Metric | Budget | How to measure |
|---|---|---|
| Cold launch → world map visible | < 3.0s | Flipper startup profiler / manual stopwatch |
| Screen transition (first frame) | < 300ms | React Navigation `onTransitionEnd` timestamp delta |
| Celebration screen first frame | < 300ms | `performance.now()` delta from trigger to first `onLayout` |
| Skill tree render (50 nodes) | 60fps (< 16ms/frame) | Flipper FPS monitor during scroll |
| World map idle FPS | 60fps | Flipper FPS monitor, 30s observation |
| JS bundle size (hermes) | < 3MB | `npx expo export --dump-assetmap` |
| Memory — world map idle | < 80MB | Xcode Instruments / Android Studio Profiler |
| Memory — active session | < 150MB | Xcode Instruments during 10-question game |
| Memory — celebration screen | < 180MB (peak) | Monitor during full celebration sequence |
| App size (iOS IPA) | < 50MB | TestFlight build |
| App size (Android AAB) | < 40MB | Google Play Console |

---

## Optimization Checklist

### Images
- [ ] All static images exported as WebP (not PNG)
- [ ] All images exported at @1x, @2x, @3x scales
- [ ] No image larger than 1080px wide at @3x
- [ ] Remote images use `expo-image` with disk cache (200MB limit)
- [ ] Default RN `Image` component not used anywhere — grep and replace

### Animations
- [ ] All animations use `useAnimatedStyle` (UI thread) — never `setState` in animation loops
- [ ] No `useSharedValue` created inside render functions — all at component top level
- [ ] All animation configs defined as constants outside components (in `design/animations.ts`)
- [ ] No inline worklet creation inside render — extract to module scope
- [ ] All `useAnimatedStyle` callbacks are pure (no side effects)
- [ ] Particle systems respect `useReduceMotion` — disabled when reduce motion is on

### Lists
- [ ] Any list > 8 items uses `@shopify/flash-list` (install: `npx expo install @shopify/flash-list`)
- [ ] All list items have stable `key` props (not array index for dynamic lists)
- [ ] No `ScrollView` with `.map()` for dynamic content > 8 items
- [ ] `getItemType` provided for heterogeneous lists

### Skia (when adopted)
- [ ] All Skia path calculations wrapped in `useMemo`
- [ ] Never recalculate paths inside `useAnimatedStyle` or render
- [ ] Pre-compute all static paths at component mount
- [ ] Skia canvas `mode="continuous"` only for animated canvases, `mode="default"` for static

### Firebase / Network
- [ ] Firestore `onSnapshot` listeners use field masks — never full document listeners
- [ ] Session writes batched with `writeBatch` — max 1 write per 2 seconds
- [ ] Write buffer accumulates changes before flushing
- [ ] Heartbeat writes are lightweight — only `lastHeartbeat` + `currentActivityStep`
- [ ] Full session writes only on zone transitions, skill completions, and exit events

### Audio
- [ ] All audio plays through `AudioManager` singleton — never direct `Audio.Sound.createAsync`
- [ ] Background music ducks during Zoey speech
- [ ] SFX pool (4 instances) — no sound dropping under rapid interactions
- [ ] Audio files are MP3, 128kbps, 44.1kHz — no WAV or uncompressed audio

### Fonts
- [ ] All fonts loaded via `expo-font` at launch
- [ ] Splash screen held until fonts resolve (`SplashScreen.preventAutoHideAsync`)
- [ ] Font subsets used where possible (Latin only for English content)

### Asset Preloading
- [ ] Lottie animations for current session pre-loaded at session start
- [ ] Zone background images pre-loaded for the recommended zone
- [ ] Celebration assets pre-loaded at game session start (not at celebration trigger)

### Accessibility
- [ ] All animations respect `isReduceMotionEnabled` via `useReduceMotion` hook
- [ ] All interactive elements have `accessibilityLabel` and `accessibilityRole`
- [ ] Minimum touch target: 44x44pt (WCAG AA)
- [ ] Child-facing touch target: 64x64pt (app standard)
- [ ] Color contrast: minimum 4.5:1 for all text (validate every token pair)
- [ ] Zoey audio has visual text alternative (parent setting: showCaptions)

---

## Dependencies to Install

Required for the full visual architecture:

```bash
# Already installed
# react-native-reanimated ~4.1.1
# react-native-gesture-handler ~2.28.0
# expo-haptics ~15.0.8
# expo-av ~16.0.8

# To install for production visual polish
npx expo install @shopify/react-native-skia    # particle systems, skill tree canvas
npx expo install lottie-react-native            # character animations
npx expo install expo-image                     # replaces RN Image (fast caching)
npx expo install expo-blur                      # frosted glass effects
npx expo install expo-linear-gradient           # gradient backgrounds
npx expo install @shopify/flash-list            # performant lists
```

**Note:** `@shopify/react-native-skia` and `lottie-react-native` require a
**custom dev build** (`npx expo run:ios` / `npx expo run:android`). They do NOT
work in Expo Go. Create a development build before adopting these libraries.

**Note:** `react-native-fast-image` is NOT recommended for Expo managed workflow.
Use `expo-image` instead — it provides the same aggressive caching with full
Expo compatibility.

---

## Profiling Commands

```bash
# Bundle size analysis
npx expo export --dump-assetmap

# Hermes bundle stats
npx react-native-bundle-visualizer

# Android performance trace
npx expo run:android --variant release
# then use Android Studio Profiler

# iOS performance trace
npx expo run:ios --configuration Release
# then use Xcode Instruments → Time Profiler
```

---

## Monitoring in Production

- [ ] Implement Sentry performance monitoring for screen load times
- [ ] Track JS frame drops via `PerformanceObserver` (React Native 0.81+)
- [ ] Log celebration screen render time to Firebase Analytics
- [ ] Alert if cold launch exceeds 4s on any device segment
