# Asset Export Specification — Zoey's World v2

For the design team. Every asset in the app follows these rules.

---

## Fonts

Download from Google Fonts and place in `mobile/assets/fonts/`:

| Font | Weight | Filename | Usage |
|---|---|---|---|
| Fredoka One | Regular | `FredokaOne-Regular.ttf` | Display headings, celebration text |
| Nunito | Regular | `Nunito-Regular.ttf` | Body text, UI labels |
| Nunito | Bold | `Nunito-Bold.ttf` | Bold body, parent headings |
| Patrick Hand | Regular | `PatrickHand-Regular.ttf` | Zoey speech bubbles |
| Orbitron | Regular | `Orbitron-Regular.ttf` | Scores, numbers, timers |

---

## Image Assets

### Format
- **All static images:** WebP format (50-70% smaller than PNG)
- **Export at 3 scales:** `@1x`, `@2x`, `@3x` (Metro resolves automatically)
- **Naming:** `kebab-case.webp` (e.g. `reading-forest-bg@2x.webp`)
- **Max dimensions:** 1080px wide at @3x for phone backgrounds

### World Map Backgrounds (per zone)

| Asset | Size @1x | Notes |
|---|---|---|
| `zone-reading-island.webp` | 200x200 | Floating island, warm amber tones, trees |
| `zone-math-island.webp` | 200x200 | Crystal formations, cool blue |
| `zone-science-island.webp` | 240x200 | Volcanic rock, test tubes |
| `zone-culture-island.webp` | 200x200 | Kente-patterned buildings, gold |
| `zone-sel-island.webp` | 200x200 | Soft meadow, rainbow arc |
| `world-map-terrain.webp` | 390x844 | Full background terrain (hills, river) |
| `world-map-clouds.webp` | 390x100 | Drifting cloud strip |

### Zone-Locked Overlay
- `zone-lock-fog.webp` — 200x200, semi-transparent gray fog
- `icon-lock.webp` — 32x32, padlock icon

### Celebration Badges
- 10 unique badge designs at 72x72 @1x
- Name: `badge-{theme}.webp` (e.g. `badge-star.webp`, `badge-crown.webp`)
- Gold rim, transparent background, high contrast

---

## Lottie Animations

Place in `mobile/assets/lottie/`. All files are `.json` (Lottie JSON format).

### Zoey Character States

| File | Loop | Duration | Description |
|---|---|---|---|
| `zoey-idle.json` | Yes | 4s | Gentle breathing, blinking |
| `zoey-talking.json` | Yes | 1s | Mouth cycle — drive progress from audio amplitude |
| `zoey-listening.json` | Yes | 3s | Leaning forward, ear tilting |
| `zoey-thinking.json` | Yes | 3s | Finger to chin, eyes up |
| `zoey-celebrating.json` | Yes | 2s | Full body dance, arms up |
| `zoey-encouraging.json` | No | 1.5s | Thumbs up animation |
| `zoey-concerned.json` | Yes | 3s | Soft worried expression |
| `zoey-excited.json` | Yes | 1.5s | Bouncing, wide eyes |
| `zoey-walking.json` | Yes | 1s | Walk cycle (for world map paths) |

**Zoey art direction:**
- 6-year-old Black girl, warm brown skin tone (palette.skin.s4 `#C68642`)
- Natural hair styled in puffs or braids
- Expressive eyes, round face
- Outfit: bright colored t-shirt + overalls
- Style: semi-flat illustration, not 3D, not hyper-cartoony

### Effects

| File | Loop | Duration | Description |
|---|---|---|---|
| `confetti-burst.json` | No | 3s | Kente-colored confetti explosion |
| `sparkle-loop.json` | Yes | 2s | Ambient sparkle for mastered skills |
| `correct-burst.json` | No | 0.8s | Green particle burst for correct answers |
| `star-spin.json` | Yes | 2s | Rotating star for mastered skill nodes |

---

## Sound Effects

Place in `mobile/assets/sounds/`. Format: `.mp3` (44.1kHz, 128kbps).

| File | Duration | Description |
|---|---|---|
| `sfx-correct.mp3` | 0.5s | Bright chime — correct answer |
| `sfx-incorrect-gentle.mp3` | 0.4s | Soft warm tone — wrong answer (never harsh) |
| `sfx-tap.mp3` | 0.1s | Light button tap |
| `sfx-zone-enter.mp3` | 0.8s | Whoosh + chime — entering a zone |
| `sfx-celebration-stinger.mp3` | 2s | Celebration music hit |
| `sfx-badge-land.mp3` | 0.5s | Metallic landing thud + sparkle |
| `sfx-streak-fire.mp3` | 0.6s | Warm rising tone — streak milestone |
| `sfx-level-up.mp3` | 1s | Ascending chime — level promotion |

### Background Music (per zone)

| File | Loop | Description |
|---|---|---|
| `music-reading-forest.mp3` | Yes | Warm, acoustic, gentle fingerpicking |
| `music-math-island.mp3` | Yes | Playful, light electronic, curious |
| `music-science-lab.mp3` | Yes | Exploratory, bubbly, quirky |
| `music-culture-corner.mp3` | Yes | Afrobeat-inspired, rhythmic, warm |
| `music-feeling-field.mp3` | Yes | Soft, ambient, calming |
| `music-world-map.mp3` | Yes | Upbeat, adventurous, inviting |
| `music-celebration.mp3` | No | 6s celebration fanfare |

---

## Color Palette Reference

See `mobile/src/design/tokens.ts` for the complete palette. Key colors for the
design team:

| Token | Hex | Usage |
|---|---|---|
| `palette.gold[500]` | #E6B800 | Primary brand, celebrations, CTAs |
| `palette.royal[500]` | #5C2E9E | Secondary brand, headers |
| `palette.earth[400]` | #C4763A | Reading zone, warmth |
| `palette.sky[400]` | #4FC4E6 | Math zone, cool accent |
| `palette.mint[300]` | #6BCB77 | Science zone, success feedback |
| `palette.kente.red` | #CC2200 | Kente accent only (never for errors) |
| `palette.kente.green` | #1A7A3A | Kente accent only |
| `palette.cream[50]` | #FFF8E7 | App background |
| `palette.skin.s4` | #C68642 | Zoey's skin tone |
| `palette.peach[300]` | #FFB347 | Wrong answer gentle amber |

**Critical rule:** Red (`coral[400]` / `kente.red`) is NEVER used for incorrect
answer feedback. Use `peach[300]` (warm amber) instead. Red is reserved for kente
pattern accents and destructive parent actions only.
