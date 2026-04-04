# Welcome Splash Animation — "Bubble Sort" Design Spec

## Overview

Redesign the welcome splash screen (screen 1 of onboarding) animation. Replace the current static floating name pills with a sequenced 3-phase animation: branding entrance, slide up, then continuous bubbling name pills with randomly assigned LIKE/NOPE badges and colored glow effects.

**Goals:** Wow factor on first launch, communicate the app's core concept (swiping on baby names) without showing the actual card UI (which is introduced on screen 2).

**Visual reference:** `.superpowers/brainstorm/18336-1774719157/content/bubble-storyboard.html`

## Animation Phases

### Phase 1: Branding Entrance (~0.8s)

The screen starts empty. Elements animate in sequentially:

| Time | Element | Animation |
|------|---------|-----------|
| 0.0s | Baby emoji | Fade up + scale bounce (0 → 1.1 → 1.0) |
| 0.3s | "bambino" title | Fade in |
| 0.5s | Tagline | Fade in |
| 0.9s | Hold complete | — |

- Everything centered vertically on the screen background gradient
- No pagination dots, no CTA button, no pills — clean entrance
- Title: Alfa Slab One, 38px, `colors.primary`
- Tagline: system font, 15px, `SHARED_COLORS.textSecondary` (#6B5B7B)

### Phase 2: Slide Up (~0.5s)

- Entire branding group (emoji + title + tagline) slides up to the top of the screen
- Uses spring easing: `SPRING_CONFIG` (damping: 15, stiffness: 150, mass: 0.5)
- Simultaneously scales down to ~80%
- Lands near the top of screen (~55px padding top at final position)
- Screen is briefly empty below the branding — creates anticipation

### Phase 3: Bubbles + CTA (loops continuously)

Triggered immediately after Phase 2 completes. (Note: pagination dots and "Next" CTA are rendered by the parent `onboarding-screens.tsx` and are always visible — WelcomeSplash does not control them.)

1. **First name pill bubbles in from the bottom**
2. New pills continue entering every **~1.5–2 seconds**

#### Pill behavior

Each pill follows this lifecycle:

1. **Enter**: Appears at the bottom of the screen at a random X position, with slight random rotation (-6° to +6°), at ~0.95 opacity
2. **Badge pop** (~0.3s after enter): A LIKE or NOPE badge pops onto the pill with a scale bounce (0 → 1.2 → 1.0). Assignment is random — no pattern, no correlation with position
3. **Glow**: When the badge appears, the pill gains a colored glow shadow:
   - LIKE: `box-shadow: 0 0 14px rgba(52, 199, 123, 0.45)`
   - NOPE: `box-shadow: 0 0 14px rgba(255, 92, 138, 0.45)`
4. **Rise + fade**: The pill continuously drifts upward, fading toward 0 opacity as it rises
5. **Sway**: Subtle side-to-side sine wave on translateX as the pill rises (~10px amplitude)
6. **Remove**: When opacity reaches ~0, the pill unmounts from the component tree

Approximately 6–8 pills should be visible at any time, spanning the area between the branding at top and the CTA at bottom.

#### Badge styling

- Container: 2px border, 4px border-radius, white background at 0.95 opacity
- Text: 8px, 800 weight, 1.5px letter-spacing
- LIKE: heart icon + "LIKE" text, `swipeColors.like` (#34C77B) for border, text, and icon fill
- NOPE: heart-dislike icon + "NOPE" text, `swipeColors.nope` (#FF5C8A) for border, text, and icon fill
- Position: absolute, offset from the pill edge (top: -11px)

#### Pill styling

- Background: white (#FFFFFF)
- Border-radius: 20px (small pills: 16px)
- Shadow: `0 2px 8px rgba(0,0,0,0.08)` — replaced by glow shadow once badge is assigned
- Font: 15px, 600 weight, `SHARED_COLORS.textPrimary` (#2D1B4E)
- Small variant: 13px font size

## Component Structure

### WelcomeSplash (refactored)

The existing `components/onboarding/welcome-splash.tsx` will be rewritten.

**Remove:**
- `FloatingNameCard` component and all 7 instances
- Static positioned pill layout
- `bobAmount`, `bobDuration`, `delay` props

**Keep:**
- Baby emoji with scale bounce entrance
- "bambino" title and tagline
- Theme-aware colors via `useTheme()`

**Add:**
- Phase sequencing logic using shared animated values
- `BubblePill` spawning system
- Slide-up animation for branding group

### BubblePill (new internal component)

Each pill is a self-contained animated component managing its own:
- Y position (rising from bottom to top)
- X position (random initial + sine wave sway)
- Opacity (fading from ~0.95 to 0)
- Rotation (random fixed value)
- Badge: type (LIKE/NOPE), scale bounce animation, delayed appearance
- Glow shadow

**Props:**
- `name: string` — the baby name to display
- `onComplete: () => void` — callback when pill has fully faded, for cleanup

### Animation implementation

- `useSharedValue` for branding Y position, branding scale, branding opacity
- Phase sequencing: `withDelay` + `withSequence` chain on branding values
- Pill spawning: `setInterval` (~1.5–2s jitter) in a `useEffect`, pushing to a `useState` array of active pill configs
- Each `BubblePill` creates its own `useSharedValue` set and runs `withTiming` for the rise/fade
- Sway: `withRepeat(withSequence(withTiming(+10), withTiming(-10)), -1)` on translateX
- Badge pop: `withDelay(300, withSpring(1, SPRING_CONFIG))` on badge scale from 0
- Cleanup: pills call `onComplete` and are filtered out of the array

### Name pool

Use a static array of ~20 popular baby names, randomly selected for each pill:
`["Luna", "Olivia", "Liam", "Emma", "Noah", "Sophia", "Milo", "Aria", "Leo", "Isla", "Finn", "Ella", "Rex", "Ivy", "Hugo", "Lily", "Ezra", "Nora", "Theo", "Ruby"]`

## Styling tokens (from theme)

All colors are theme-aware via `useTheme()`:

| Token | Pink theme value | Usage |
|-------|-----------------|-------|
| `colors.primary` | #FF5C8A | Title color |
| `SHARED_COLORS.textPrimary` | #2D1B4E | Pill text |
| `SHARED_COLORS.textSecondary` | #6B5B7B | Tagline |
| `SHARED_COLORS.surface` | #FFFFFF | Pill background |
| `swipeColors.like` | #34C77B | LIKE badge border/text/glow |
| `swipeColors.nope` | #FF5C8A | NOPE badge border/text/glow |
| `gradients.screenBg` | ['#FFF0F5', '#FFE4EC', '#F5E6FF'] | Screen background |

## Files to modify

| File | Change |
|------|--------|
| `components/onboarding/welcome-splash.tsx` | Full rewrite — new 3-phase animation with BubblePill system |

No other files need changes. The `onboarding-screens.tsx` wrapper remains untouched — it already provides the pagination dots and Next CTA at the bottom, and WelcomeSplash fills the screen area above.

## Edge cases

- **Rapid "Next" tap**: Animation should not block navigation. If user taps Next during Phase 1 or 2, it should still work.
- **Theme changes**: All colors come from `useTheme()`, so the animation works across all 4 candy themes.
- **Performance**: Cap active pills at 8. If a pill hasn't faded out by the time a 9th would spawn, skip spawning until one completes.
- **Screen sizes**: Pills use absolute Y positioning relative to the container. The bubble zone spans from below the branding to above the parent's bottom area (dots + CTA are at `bottom: 50` in `onboarding-screens.tsx`, ~90px tall). Pills should start entering from below this zone and rise upward.
