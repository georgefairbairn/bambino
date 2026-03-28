# Onboarding Redesign — Design Spec

## Overview

Replace the current static onboarding carousel (5 slides with icons and text descriptions) with a 3-screen animated experience focused on emotional first impression, visual delight, and personalization.

**Goals:** Wow factor, playful personality, teach swipe mechanics visually, let users pick their theme.

**Approach:** Animated Storybook — 3 punchy screens with real animations, no walls of text.

## Screen 1: Welcome Splash

**Purpose:** Emotional first impression. Establish brand personality.

**Layout:**
- Full-screen gradient background (themed: pink default `#FFF0F5 → #FFE4EC → #F5E6FF`)
- 7 floating name cards scattered across the background (Olivia, Liam, Emma, Noah, Sophia, Milo, Aria)
  - White pills with subtle shadows, slightly rotated at various angles
  - Continuously bob up/down with looping Reanimated springs (staggered timing, 3–4s periods)
  - Fly in from edges on mount with staggered delays (200ms apart)
- Center content (vertically centered, slightly above midpoint):
  - Baby emoji (👶) — bouncy scale-in from 0 (spring: damping 8, stiffness 100)
  - "bambino" in Alfa Slab One, 38px, `#2D1B4E` — fade in + slide up (300ms delay)
  - "Find the perfect name, together." tagline, 15px, `#6B5B7B` — fade in (500ms delay)
- Skip button: top-right, subtle fade-in, `#6B5B7B`
- Bottom: pagination dots (3, first active) + "Next" button (themed gradient)

**Animations (Reanimated):**
- Name cards: `FadeIn` from edges → `withRepeat(withSequence(withSpring))` for continuous bob
- Emoji: `withSpring` scale 0→1 (damping: 8, stiffness: 100)
- Title: `FadeInUp` with 300ms delay
- Tagline: `FadeInUp` with 500ms delay

## Screen 2: Swipe Demo

**Purpose:** Teach swipe mechanics visually through an animated demo card. No reading required.

**Layout:**
- Full-screen themed gradient background
- Title: "Swipe to Decide" in Alfa Slab One, 20px, centered, at top with breathing room below skip button
- Animated demo card (non-interactive, purely demonstrative):
  - Matches the real `swipe-card.tsx` design exactly:
    - White card with 4px themed border (`#FF5C8A`), 12px border radius
    - Left-aligned content: name "Luna" in Alfa Slab One 38px, gender underline (pink `#FF8FAB`), origin pill with flag emoji (🇮🇹 Latin) + speaker icon (Ionicons `volume-high`), meaning box with `surfaceSubtle` bg
    - "swipe" hint with chevrons at card bottom
  - Peek card behind at 0.95 scale (matches `PEEK_CARD` config)
  - LIKE stamp: Ionicons `heart` icon + "LIKE" text in bordered pill (`#34C77B`), top-left, rotated -12deg
  - NOPE stamp: Ionicons `heart-dislike` icon + "NOPE" text in bordered pill (`#FF5C8A`), top-right, rotated +12deg
  - Card background flashes full green on right-swipe, full red/pink on left-swipe (0.55 opacity)
- Text below card: "Swipe **right** to like, **left** to pass" (color-coded green/pink)
- No action buttons — swipe gestures only (matches real app)
- Bottom: pagination dots (3, second active) + "Next" button

**Animation sequence (loops ~5s):**
1. Card rests at center
2. Card translates right 50px + rotates 6deg → LIKE stamp bounces in (scale 0.6→1.15→1) → card bg flashes green
3. Card springs back to center
4. Card translates left 50px + rotates -6deg → NOPE stamp bounces in → card bg flashes pink
5. Card springs back to center → loop repeats

**Implementation:** Use `withRepeat`, `withSequence`, `withTiming` for the card position/rotation. Stamps use `withSpring` for the bounce-in. Background color uses `interpolateColor` on the card's `translateX`.

## Screen 3: Pick Your Vibe (Theme Picker)

**Purpose:** Personalization. Let users choose their candy theme before entering the app.

**Layout:**
- Full-screen themed gradient background (morphs on theme selection)
- Title: "Pick Your Vibe" in Alfa Slab One, 20px, centered
- 2×2 theme grid with 14px gap:
  - Each card: white bg, 16px border radius, gradient swatch circle (46px), theme name with emoji
  - Rose 🌸 (`#FF7EB3 → #FF5C8A`), Mint 🌿 (`#6EE7B7 → #34D399`), Sky 🦋 (`#93C5FD → #60A5FA`), Honey 🍯 (`#FCD34D → #FBBF24`)
  - Selected state: themed border color, checkmark badge centered inside swatch circle (white bg, theme-colored checkmark)
  - Pink pre-selected as default
- Preview mini-card below grid:
  - Shows a name card ("Olivia") with the selected theme's border color, underline color, and pill bg color
  - "Preview" label in uppercase
  - Updates live when theme changes
- Bottom: pagination dots (3, third active) + "Get Started" button (uses selected theme's gradient)

**Interactions:**
- Tap theme card → selected state with checkmark, screen background gradient morphs, preview card updates, CTA button gradient updates
- All transitions animated with 0.6s ease (in real app: Reanimated `withTiming` or `withSpring`)
- On "Get Started": calls `completeOnboarding()` from `useOnboarding` hook, sets AsyncStorage flag

## Shared Elements

**Pagination dots:** 3 dots at bottom of each screen, active dot is elongated (20px wide), inactive dots are circles (6px). `#2D1B4E` color, 0.25 opacity for inactive.

**Skip button:** Top-right on all screens, "Skip" text in `#6B5B7B`. Tapping skips directly to main app (calls `completeOnboarding()`).

**Navigation:** Horizontal swipe between screens (like current FlatList carousel) OR button-driven ("Next" / "Get Started"). Dots indicate progress.

**Fonts:** Alfa Slab One for display headings, system font for body text.

## Technical Notes

- **File to modify:** `components/onboarding/onboarding-screens.tsx` (complete rewrite)
- **Hook unchanged:** `hooks/use-onboarding.ts` remains as-is (controls display via AsyncStorage)
- **Trigger unchanged:** `app/(tabs)/_layout.tsx` renders `<OnboardingScreens>` when `!hasCompletedOnboarding`
- **Dependencies:** react-native-reanimated (already installed), react-native-gesture-handler (already installed), expo-linear-gradient (already installed)
- **No new dependencies required**
- **Theme system:** Uses existing `useTheme()` hook and `THEME_META` from `constants/theme.ts`
- **Animations:** All Reanimated — `FadeInUp`, `FadeInDown`, `withSpring`, `withRepeat`, `withSequence`, `withTiming`, `interpolateColor`, `useAnimatedStyle`

## Mockups

Visual mockups are available in `.superpowers/brainstorm/74324-1774715645/content/`:
- `screen1-welcome-v2.html` — Welcome Splash (approved)
- `screen2-swipe-v5.html` — Swipe Demo (approved)
- `screen3-theme-picker.html` — Theme Picker (approved)
