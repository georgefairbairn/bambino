# Welcome Splash "Bubble Sort" Animation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the welcome splash screen (onboarding screen 1) with a 3-phase animation: branding entrance → slide up → continuously bubbling name pills with LIKE/NOPE badges and colored glow effects.

**Architecture:** Single-file rewrite of `welcome-splash.tsx`. The component manages a 3-phase animation sequence using `react-native-reanimated` shared values and timers. An internal `BubblePill` component handles each pill's lifecycle (enter → badge pop → rise/sway/fade → unmount). Pill spawning is driven by a `setInterval` that pushes pill configs into a `useState` array.

**Tech Stack:** React Native, react-native-reanimated, Ionicons (heart/heart-dislike icons), theme system via `useTheme()`

**Spec:** `docs/superpowers/specs/2026-03-28-welcome-splash-animation-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `components/onboarding/welcome-splash.tsx` | Full rewrite | 3-phase animation: branding entrance, slide-up, bubble pill spawning system with BubblePill internal component |

No other files are created or modified.

---

### Task 1: Strip Old Implementation and Scaffold New Component Shell

**Files:**
- Modify: `components/onboarding/welcome-splash.tsx`

- [ ] **Step 1: Replace the file contents with the new component shell**

Replace the entire file with this scaffold. It keeps the export signature identical, sets up the imports we'll need, and renders just the branding (Phase 1 entrance will be wired in Task 2).

```tsx
import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { SWIPE_COLORS, SPRING_CONFIG } from '@/constants/swipe';
import { useTheme } from '@/contexts/theme-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const NAME_POOL = [
  'Luna', 'Olivia', 'Liam', 'Emma', 'Noah', 'Sophia', 'Milo', 'Aria',
  'Leo', 'Isla', 'Finn', 'Ella', 'Rex', 'Ivy', 'Hugo', 'Lily',
  'Ezra', 'Nora', 'Theo', 'Ruby',
];

const MAX_PILLS = 8;
const PILL_SPAWN_MIN = 1500; // ms
const PILL_SPAWN_MAX = 2000; // ms
const PILL_RISE_DURATION = 8000; // ms for full rise from bottom to top
const BADGE_DELAY = 300; // ms after pill enters before badge pops
// Bottom area of parent (dots + CTA) occupies ~90px from bottom: 50
const BOTTOM_ZONE = 140; // start pills above parent's bottom controls

interface PillConfig {
  id: number;
  name: string;
  startX: number; // px from left
  rotation: number; // degrees (-6 to +6)
  isLike: boolean;
  isSmall: boolean;
}

export function WelcomeSplash() {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {/* Branding group — will animate in Task 2 */}
      <View style={styles.brandingCenter}>
        <Text style={styles.emoji}>{'\u{1F476}'}</Text>
        <Text style={[styles.brandName, { color: colors.primary }]}>bambino</Text>
        <Text style={styles.tagline}>Find the perfect name, together.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    flex: 1,
    overflow: 'hidden',
  },
  brandingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  brandName: {
    fontSize: 38,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
  },
});
```

- [ ] **Step 2: Verify the app still renders the onboarding screen**

Run: `npm start` → open on iOS simulator → confirm the welcome splash shows the baby emoji, "bambino", and tagline centered on the gradient background, with dots and Next button visible at the bottom (rendered by the parent).

- [ ] **Step 3: Commit**

```bash
git add components/onboarding/welcome-splash.tsx
git commit -m "refactor(onboarding): strip old floating pills, scaffold new welcome-splash shell

Co-Authored-By: Claude <svc-devxp-claude@slack-corp.com>"
```

---

### Task 2: Phase 1 — Branding Entrance Animation

**Files:**
- Modify: `components/onboarding/welcome-splash.tsx`

- [ ] **Step 1: Add Phase 1 animated entrance to the branding group**

Replace the `WelcomeSplash` function body with this implementation. Phase 1 animates: emoji (fade up + scale bounce at 0s), title (fade in at 0.3s), tagline (fade in at 0.5s). The `phase` shared value tracks which phase we're in — it starts at 1 and will be used in later tasks.

```tsx
export function WelcomeSplash() {
  const { colors } = useTheme();

  // Phase tracking: 1 = entrance, 2 = slide up, 3 = bubbles
  const phase = useSharedValue(1);

  // Phase 1: Emoji entrance — fade up + scale bounce
  const emojiOpacity = useSharedValue(0);
  const emojiScale = useSharedValue(0);
  const emojiTranslateY = useSharedValue(30);

  // Phase 1: Title + tagline fade-in
  const titleOpacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);

  // Phase 2: Branding group position + scale (wired in Task 3)
  const brandingTranslateY = useSharedValue(0);
  const brandingScale = useSharedValue(1);

  useEffect(() => {
    // Phase 1 sequence
    // 0.0s — emoji fades up + scale bounce
    emojiOpacity.value = withTiming(1, { duration: 400 });
    emojiTranslateY.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) });
    emojiScale.value = withSequence(
      withTiming(1.1, { duration: 400, easing: Easing.out(Easing.cubic) }),
      withSpring(1, { damping: 8, stiffness: 120 }),
    );

    // 0.3s — title fades in
    titleOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));

    // 0.5s — tagline fades in
    taglineOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const emojiStyle = useAnimatedStyle(() => ({
    opacity: emojiOpacity.value,
    transform: [
      { translateY: emojiTranslateY.value },
      { scale: emojiScale.value },
    ],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  const brandingGroupStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: brandingTranslateY.value },
      { scale: brandingScale.value },
    ],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.brandingCenter, brandingGroupStyle]}>
        <Animated.Text style={[styles.emoji, emojiStyle]}>{'\u{1F476}'}</Animated.Text>
        <Animated.Text style={[styles.brandName, { color: colors.primary }, titleStyle]}>
          bambino
        </Animated.Text>
        <Animated.Text style={[styles.tagline, taglineStyle]}>
          Find the perfect name, together.
        </Animated.Text>
      </Animated.View>
    </View>
  );
}
```

- [ ] **Step 2: Verify Phase 1 plays on the simulator**

Run the app → onboarding screen 1 should show: emoji fades up with scale bounce, title fades in 0.3s later, tagline fades in 0.5s later. Everything centered. No pills visible.

- [ ] **Step 3: Commit**

```bash
git add components/onboarding/welcome-splash.tsx
git commit -m "feat(onboarding): add Phase 1 branding entrance animation

Co-Authored-By: Claude <svc-devxp-claude@slack-corp.com>"
```

---

### Task 3: Phase 2 — Slide Up Animation

**Files:**
- Modify: `components/onboarding/welcome-splash.tsx`

- [ ] **Step 1: Wire Phase 2 slide-up into the useEffect chain**

After the Phase 1 sequence, at ~0.9s the branding group should slide up and scale down to 80%. Add this to the end of the existing `useEffect` block (after the tagline opacity line):

```tsx
    // Phase 2 at ~0.9s — branding slides up + scales down
    // Calculate how far to move: from center to near top (paddingTop ~55px)
    // The branding is centered (flex:1 + justifyContent:center), so we need
    // to move it up by roughly half the screen minus the target top position
    const targetY = -(SCREEN_HEIGHT / 2) + 120; // lands ~55px from top after scale

    brandingTranslateY.value = withDelay(
      900,
      withSpring(targetY, SPRING_CONFIG),
    );
    brandingScale.value = withDelay(
      900,
      withSpring(0.8, SPRING_CONFIG),
    );

    // Mark Phase 3 ready after slide-up settles (~1.4s)
    setTimeout(() => {
      phase.value = 3;
    }, 1400);
```

- [ ] **Step 2: Update the brandingCenter style to remove the paddingBottom offset**

The `brandingCenter` style currently has `paddingBottom: 80` to offset the branding slightly above center. This is correct for Phase 1. The slide-up animation handles the final positioning, so no style change is needed — the `paddingBottom` keeps Phase 1 looking good and the `translateY` overrides the final position.

- [ ] **Step 3: Verify Phase 2 plays on the simulator**

Run the app → after Phase 1 completes (~0.9s), the branding group should smoothly spring upward and scale to ~80%, landing near the top of the screen. The area below should be empty for a moment.

- [ ] **Step 4: Commit**

```bash
git add components/onboarding/welcome-splash.tsx
git commit -m "feat(onboarding): add Phase 2 slide-up animation

Co-Authored-By: Claude <svc-devxp-claude@slack-corp.com>"
```

---

### Task 4: BubblePill Component — Rise, Fade, and Sway

**Files:**
- Modify: `components/onboarding/welcome-splash.tsx`

- [ ] **Step 1: Add the BubblePill component above WelcomeSplash**

This component handles a single pill's lifecycle: it enters from the bottom, rises upward while fading out and swaying side-to-side, then calls `onComplete` when done. The badge and glow are added in Task 5.

Add this between the constants/interfaces and the `WelcomeSplash` function:

```tsx
function BubblePill({
  config,
  onComplete,
}: {
  config: PillConfig;
  onComplete: () => void;
}) {
  const { colors } = useTheme();

  // Rise: from bottom of screen to above branding
  const translateY = useSharedValue(0);
  // Sway: subtle side-to-side sine wave
  const swayX = useSharedValue(0);
  // Fade: start near full opacity, fade to 0
  const opacity = useSharedValue(0.95);
  // Badge scale: pops in after delay
  const badgeScale = useSharedValue(0);

  useEffect(() => {
    // Rise from bottom to top over PILL_RISE_DURATION
    const riseDistance = SCREEN_HEIGHT - BOTTOM_ZONE;
    translateY.value = withTiming(-riseDistance, {
      duration: PILL_RISE_DURATION,
      easing: Easing.linear,
    }, (finished) => {
      if (finished) {
        runOnJS(onComplete)();
      }
    });

    // Fade out as pill rises
    opacity.value = withTiming(0, {
      duration: PILL_RISE_DURATION,
      easing: Easing.in(Easing.quad),
    });

    // Sway: gentle side-to-side oscillation
    swayX.value = withRepeat(
      withSequence(
        withTiming(10, { duration: 1500, easing: Easing.inOut(Easing.sine) }),
        withTiming(-10, { duration: 1500, easing: Easing.inOut(Easing.sine) }),
      ),
      -1, // infinite
    );

    // Badge pops in after BADGE_DELAY
    badgeScale.value = withDelay(
      BADGE_DELAY,
      withSpring(1, { ...SPRING_CONFIG, stiffness: 200 }),
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pillStyle = useAnimatedStyle(() => {
    const glowColor = config.isLike
      ? 'rgba(52, 199, 123, 0.45)'
      : 'rgba(255, 92, 138, 0.45)';

    return {
      opacity: opacity.value,
      transform: [
        { translateY: translateY.value },
        { translateX: swayX.value },
        { rotate: `${config.rotation}deg` },
      ],
      // Apply glow once badge is visible
      shadowColor: badgeScale.value > 0.5
        ? (config.isLike ? SWIPE_COLORS.like : SWIPE_COLORS.nope)
        : '#000',
      shadowOpacity: badgeScale.value > 0.5 ? 0.45 : 0.08,
      shadowRadius: badgeScale.value > 0.5 ? 14 : 8,
    };
  });

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
    opacity: badgeScale.value,
  }));

  const badgeColor = config.isLike ? SWIPE_COLORS.like : SWIPE_COLORS.nope;
  const badgeIcon = config.isLike ? 'heart' : 'heart-dislike';
  const badgeText = config.isLike ? 'LIKE' : 'NOPE';

  return (
    <Animated.View
      style={[
        styles.pill,
        config.isSmall && styles.pillSmall,
        { left: config.startX },
        { bottom: BOTTOM_ZONE },
        pillStyle,
      ]}
    >
      <Text style={[styles.pillText, config.isSmall && styles.pillTextSmall]}>
        {config.name}
      </Text>

      {/* Badge */}
      <Animated.View
        style={[
          styles.badge,
          { borderColor: badgeColor },
          badgeStyle,
        ]}
      >
        <Ionicons name={badgeIcon} size={10} color={badgeColor} />
        <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeText}</Text>
      </Animated.View>
    </Animated.View>
  );
}
```

- [ ] **Step 2: Add pill and badge styles to the StyleSheet**

Add these styles to the existing `StyleSheet.create` call:

```tsx
  pill: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  pillSmall: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  pillText: {
    fontSize: 15,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#2D1B4E',
  },
  pillTextSmall: {
    fontSize: 13,
  },
  badge: {
    position: 'absolute',
    top: -11,
    right: -4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
```

- [ ] **Step 3: Verify BubblePill renders correctly (we'll test integration in Task 5)**

The component is defined but not yet rendered. Verification happens in Task 5 after the spawning system is wired up.

- [ ] **Step 4: Commit**

```bash
git add components/onboarding/welcome-splash.tsx
git commit -m "feat(onboarding): add BubblePill component with rise, fade, sway, and badge

Co-Authored-By: Claude <svc-devxp-claude@slack-corp.com>"
```

---

### Task 5: Phase 3 — Pill Spawning System

**Files:**
- Modify: `components/onboarding/welcome-splash.tsx`

- [ ] **Step 1: Add pill spawning logic to WelcomeSplash**

Add state and spawning logic inside the `WelcomeSplash` function, after the existing shared values and before the `useEffect`:

```tsx
  // Phase 3: Pill spawning
  const [pills, setPills] = useState<PillConfig[]>([]);
  const nextId = useRef(0);
  const spawnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const removePill = useCallback((id: number) => {
    setPills((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const spawnPill = useCallback(() => {
    setPills((prev) => {
      if (prev.length >= MAX_PILLS) return prev; // cap at 8

      const id = nextId.current++;
      const name = NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)];
      // Random X: leave 20px margin on each side, account for pill width (~100px)
      const startX = 20 + Math.random() * (SCREEN_WIDTH - 140);
      const rotation = (Math.random() - 0.5) * 12; // -6 to +6 degrees
      const isLike = Math.random() > 0.5;
      const isSmall = Math.random() > 0.65; // ~35% chance of small variant

      return [...prev, { id, name, startX, rotation, isLike, isSmall }];
    });
  }, []);

  // Schedule next spawn with jitter
  const scheduleNextSpawn = useCallback(() => {
    const delay = PILL_SPAWN_MIN + Math.random() * (PILL_SPAWN_MAX - PILL_SPAWN_MIN);
    spawnTimer.current = setTimeout(() => {
      spawnPill();
      scheduleNextSpawn();
    }, delay);
  }, [spawnPill]);
```

- [ ] **Step 2: Add Phase 3 trigger to the useEffect**

Add a second `useEffect` that starts pill spawning when phase transitions to 3:

```tsx
  // Start pill spawning when Phase 3 begins
  useEffect(() => {
    // Phase 3 starts at ~1.4s (set by setTimeout in Phase 2)
    const startDelay = setTimeout(() => {
      spawnPill(); // First pill immediately
      scheduleNextSpawn(); // Then continuous spawning
    }, 1400);

    return () => {
      clearTimeout(startDelay);
      if (spawnTimer.current) clearTimeout(spawnTimer.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 3: Render the pills in the JSX**

Add the pill rendering below the branding group in the return JSX:

```tsx
  return (
    <View style={styles.container}>
      <Animated.View style={[styles.brandingCenter, brandingGroupStyle]}>
        <Animated.Text style={[styles.emoji, emojiStyle]}>{'\u{1F476}'}</Animated.Text>
        <Animated.Text style={[styles.brandName, { color: colors.primary }, titleStyle]}>
          bambino
        </Animated.Text>
        <Animated.Text style={[styles.tagline, taglineStyle]}>
          Find the perfect name, together.
        </Animated.Text>
      </Animated.View>

      {/* Phase 3: Bubbling pills */}
      {pills.map((pill) => (
        <BubblePill
          key={pill.id}
          config={pill}
          onComplete={() => removePill(pill.id)}
        />
      ))}
    </View>
  );
```

- [ ] **Step 4: Clean up: remove the phase shared value since we use setTimeout**

The `phase` shared value was set up in Task 2 but we're using a simple `setTimeout` for the Phase 3 trigger instead. Remove the `phase` shared value declaration and its assignment in the first `useEffect`:

Remove this line from shared value declarations:
```tsx
  const phase = useSharedValue(1);
```

Remove this block from the first `useEffect`:
```tsx
    // Mark Phase 3 ready after slide-up settles (~1.4s)
    setTimeout(() => {
      phase.value = 3;
    }, 1400);
```

(The Phase 3 spawning is now handled by the second `useEffect` with its own 1400ms delay.)

- [ ] **Step 5: Verify the full 3-phase animation on the simulator**

Run the app → confirm:
1. Phase 1: Emoji, title, tagline animate in sequentially (centered)
2. Phase 2: At ~0.9s, branding slides up and scales to 80%
3. Phase 3: At ~1.4s, pills start bubbling up from the bottom with LIKE/NOPE badges, glow effects, sway, and fade-out
4. Tapping "Next" still navigates to screen 2 at any point during the animation
5. No more than 8 pills visible at once

- [ ] **Step 6: Commit**

```bash
git add components/onboarding/welcome-splash.tsx
git commit -m "feat(onboarding): add Phase 3 bubble pill spawning system

Co-Authored-By: Claude <svc-devxp-claude@slack-corp.com>"
```

---

### Task 6: Polish and Edge Cases

**Files:**
- Modify: `components/onboarding/welcome-splash.tsx`

- [ ] **Step 1: Randomize badge position (left vs right) on the pill**

Currently the badge is always at `right: -4`. Randomize whether it appears on the left or right side of the pill. Add a `badgeOnLeft` field to `PillConfig`:

In the interface:
```tsx
interface PillConfig {
  id: number;
  name: string;
  startX: number;
  rotation: number;
  isLike: boolean;
  isSmall: boolean;
  badgeOnLeft: boolean;
}
```

In the `spawnPill` callback, add:
```tsx
      const badgeOnLeft = Math.random() > 0.5;
      return [...prev, { id, name, startX, rotation, isLike, isSmall, badgeOnLeft }];
```

In the `BubblePill` badge JSX, replace the static `right: -4` with a conditional style:
```tsx
      <Animated.View
        style={[
          styles.badge,
          { borderColor: badgeColor },
          config.badgeOnLeft ? { left: -4, right: undefined } : { right: -4, left: undefined },
          badgeStyle,
        ]}
      >
```

- [ ] **Step 2: Prevent duplicate consecutive names**

In `spawnPill`, add logic to avoid picking the same name that's currently on screen:

```tsx
    setPills((prev) => {
      if (prev.length >= MAX_PILLS) return prev;

      const id = nextId.current++;
      // Avoid names already visible
      const usedNames = new Set(prev.map((p) => p.name));
      const available = NAME_POOL.filter((n) => !usedNames.has(n));
      const pool = available.length > 0 ? available : NAME_POOL;
      const name = pool[Math.floor(Math.random() * pool.length)];
      // ... rest unchanged
```

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No errors (warnings about eslint-disable are acceptable).

- [ ] **Step 4: Final visual verification**

Run the app → verify:
1. Badges appear on both left and right sides of pills randomly
2. No two identical names visible at the same time (or very rarely if pool exhausted)
3. Animation is smooth, pills don't overlap the dots/CTA area
4. Works with a non-default theme (change theme in later onboarding screen, then restart onboarding to check)

- [ ] **Step 5: Commit**

```bash
git add components/onboarding/welcome-splash.tsx
git commit -m "fix(onboarding): polish bubble animation — randomize badge position, prevent duplicate names

Co-Authored-By: Claude <svc-devxp-claude@slack-corp.com>"
```

---

## Complete File Reference

After all tasks, `components/onboarding/welcome-splash.tsx` will contain:

- **Imports**: react, react-native, reanimated, Ionicons, theme/swipe constants, useTheme
- **Constants**: `NAME_POOL` (20 names), `MAX_PILLS` (8), timing constants, `PillConfig` interface
- **`BubblePill`** internal component: manages rise, sway, fade, badge pop, glow shadow
- **`WelcomeSplash`** exported component:
  - Phase 1 shared values + animations (emoji, title, tagline entrance)
  - Phase 2 shared values + animations (branding slide-up + scale-down)
  - Phase 3 pill spawning state + intervals
  - JSX: branding group (Animated.View) + pill map
- **StyleSheet**: container, brandingCenter, emoji, brandName, tagline, pill, pillSmall, pillText, pillTextSmall, badge, badgeText
