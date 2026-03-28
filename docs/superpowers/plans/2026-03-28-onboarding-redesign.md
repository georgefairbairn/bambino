# Onboarding Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 5-slide static onboarding carousel with a 3-screen animated storybook experience featuring a welcome splash, swipe demo, and theme picker.

**Architecture:** Complete rewrite of `components/onboarding/onboarding-screens.tsx`, split into a container component + 3 screen components. The container manages horizontal FlatList navigation, pagination dots, skip button, and next/get-started button. Each screen is a self-contained animated component. The `useOnboarding` hook and `_layout.tsx` trigger remain unchanged.

**Tech Stack:** React Native, react-native-reanimated (springs, sequences, repeats, interpolateColor), expo-linear-gradient, Ionicons, existing theme system (`useTheme`, `THEME_META`).

**Design Spec:** `docs/superpowers/specs/2026-03-28-onboarding-redesign-design.md`

**Visual Mockups:** `.superpowers/brainstorm/74324-1774715645/content/` (screen1-welcome-v2.html, screen2-swipe-v5.html, screen3-theme-picker.html)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `components/onboarding/onboarding-screens.tsx` | Rewrite | Container: FlatList carousel, pagination dots, skip button, next/get-started CTA |
| `components/onboarding/welcome-splash.tsx` | Create | Screen 1: floating name cards, brand reveal animations |
| `components/onboarding/swipe-demo.tsx` | Create | Screen 2: animated demo card with swipe simulation loop |
| `components/onboarding/theme-picker.tsx` | Create | Screen 3: 2x2 theme grid, preview card, theme selection |
| `components/onboarding/index.ts` | No change | Already exports `OnboardingScreens` |

---

### Task 1: Onboarding Container (Shell)

**Files:**
- Rewrite: `components/onboarding/onboarding-screens.tsx`

This task creates the outer container with navigation, pagination, and buttons — rendering placeholder screens. Later tasks fill in each screen.

- [ ] **Step 1: Create placeholder screen components**

Create `components/onboarding/welcome-splash.tsx`:

```tsx
import { View, Text, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export function WelcomeSplash() {
  return (
    <View style={{ width, flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Screen 1: Welcome</Text>
    </View>
  );
}
```

Create `components/onboarding/swipe-demo.tsx`:

```tsx
import { View, Text, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export function SwipeDemo() {
  return (
    <View style={{ width, flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Screen 2: Swipe Demo</Text>
    </View>
  );
}
```

Create `components/onboarding/theme-picker.tsx`:

```tsx
import { View, Text, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export function ThemePicker() {
  return (
    <View style={{ width, flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Screen 3: Theme Picker</Text>
    </View>
  );
}
```

- [ ] **Step 2: Rewrite the onboarding container**

Replace the entire contents of `components/onboarding/onboarding-screens.tsx` with:

```tsx
import { useState, useRef, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { WelcomeSplash } from './welcome-splash';
import { SwipeDemo } from './swipe-demo';
import { ThemePicker } from './theme-picker';

const { width } = Dimensions.get('window');
const TOTAL_SCREENS = 3;

interface OnboardingScreensProps {
  onComplete: () => void;
}

const SCREENS = [
  { id: '1', component: WelcomeSplash },
  { id: '2', component: SwipeDemo },
  { id: '3', component: ThemePicker },
];

export function OnboardingScreens({ onComplete }: OnboardingScreensProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const { gradients } = useTheme();

  const handleNext = useCallback(() => {
    if (currentIndex < TOTAL_SCREENS - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete();
    }
  }, [currentIndex, onComplete]);

  const isLastScreen = currentIndex === TOTAL_SCREENS - 1;

  const renderScreen = useCallback(
    ({ item }: { item: (typeof SCREENS)[number] }) => {
      const Screen = item.component;
      return <Screen />;
    },
    [],
  );

  return (
    <View style={styles.container}>
      {/* Background gradient — uses current theme */}
      <LinearGradient
        colors={[...gradients.screenBg]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      {/* Skip button */}
      <Pressable style={styles.skipButton} onPress={onComplete} hitSlop={12}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      {/* Screen carousel */}
      <FlatList
        ref={flatListRef}
        data={SCREENS}
        renderItem={renderScreen}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        scrollEnabled={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      />

      {/* Bottom area: dots + button */}
      <View style={styles.bottomArea}>
        {/* Pagination dots */}
        <View style={styles.dotsRow}>
          {Array.from({ length: TOTAL_SCREENS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Next / Get Started button */}
        <Pressable onPress={handleNext}>
          <LinearGradient
            colors={[...gradients.buttonPrimary]}
            style={styles.ctaButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.ctaText}>
              {isLastScreen ? 'Get Started' : 'Next'}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
  },
  bottomArea: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2D1B4E',
  },
  dotActive: {
    width: 20,
    opacity: 1,
  },
  dotInactive: {
    width: 6,
    opacity: 0.25,
  },
  ctaButton: {
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 14,
    minWidth: 220,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts?.sans,
  },
});
```

- [ ] **Step 3: Verify the shell renders**

Run: `npm start` and open in iOS simulator. Confirm:
- 3 placeholder screens visible via Next button
- Skip button works (exits onboarding)
- Pagination dots update on each screen
- "Get Started" appears on screen 3 and exits onboarding
- Background gradient matches current theme

- [ ] **Step 4: Commit**

```bash
git add components/onboarding/onboarding-screens.tsx components/onboarding/welcome-splash.tsx components/onboarding/swipe-demo.tsx components/onboarding/theme-picker.tsx
git commit -m "feat(onboarding): rewrite container with 3-screen shell

Replaces 5-slide static carousel with new container supporting
3 animated screens. Navigation, pagination dots, skip, and
next/get-started button all functional. Screen content is placeholder."
```

---

### Task 2: Screen 1 — Welcome Splash

**Files:**
- Modify: `components/onboarding/welcome-splash.tsx`

**Reference:** Design spec Screen 1, mockup `screen1-welcome-v2.html`

- [ ] **Step 1: Implement the floating name cards data**

Replace `components/onboarding/welcome-splash.tsx` with:

```tsx
import { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import { Fonts } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

interface FloatingName {
  name: string;
  x: number; // % from left (0-100)
  y: number; // % from top (0-100)
  rotation: number; // degrees
  delay: number; // ms entrance delay
  bobDuration: number; // ms per bob cycle
  bobAmount: number; // px bob distance
}

const FLOATING_NAMES: FloatingName[] = [
  { name: 'Olivia', x: 8, y: 12, rotation: -6, delay: 0, bobDuration: 3000, bobAmount: 8 },
  { name: 'Liam', x: 65, y: 8, rotation: 4, delay: 200, bobDuration: 3500, bobAmount: 10 },
  { name: 'Emma', x: 5, y: 35, rotation: 3, delay: 400, bobDuration: 3200, bobAmount: 7 },
  { name: 'Noah', x: 70, y: 32, rotation: -5, delay: 600, bobDuration: 3800, bobAmount: 9 },
  { name: 'Sophia', x: 55, y: 58, rotation: 5, delay: 800, bobDuration: 3400, bobAmount: 8 },
  { name: 'Milo', x: 10, y: 62, rotation: -4, delay: 1000, bobDuration: 3600, bobAmount: 10 },
  { name: 'Aria', x: 60, y: 78, rotation: 3, delay: 1200, bobDuration: 3100, bobAmount: 7 },
];

function FloatingNameCard({ card }: { card: FloatingName }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      card.delay,
      withRepeat(
        withSequence(
          withTiming(card.bobAmount, { duration: card.bobDuration / 2 }),
          withTiming(-card.bobAmount, { duration: card.bobDuration / 2 }),
        ),
        -1, // infinite
        true, // reverse
      ),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${card.rotation}deg` },
    ],
  }));

  return (
    <Animated.View
      entering={FadeIn.delay(card.delay).duration(600).springify()}
      style={[
        styles.nameCard,
        {
          left: `${card.x}%`,
          top: `${card.y}%`,
        },
        animatedStyle,
      ]}
    >
      <Text style={styles.nameCardText}>{card.name}</Text>
    </Animated.View>
  );
}

export function WelcomeSplash() {
  // Baby emoji scale-in spring
  const emojiScale = useSharedValue(0);

  useEffect(() => {
    emojiScale.value = withSpring(1, { damping: 8, stiffness: 100 });
  }, []);

  const emojiStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emojiScale.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Floating name cards */}
      {FLOATING_NAMES.map((card) => (
        <FloatingNameCard key={card.name} card={card} />
      ))}

      {/* Center content */}
      <View style={styles.centerContent}>
        <Animated.Text style={[styles.emoji, emojiStyle]}>
          {'\u{1F476}'}
        </Animated.Text>

        <Animated.Text
          entering={FadeIn.delay(300).duration(400)}
          style={styles.brandName}
        >
          bambino
        </Animated.Text>

        <Animated.Text
          entering={FadeIn.delay(500).duration(400)}
          style={styles.tagline}
        >
          Find the perfect name, together.
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    flex: 1,
  },
  nameCard: {
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
  nameCardText: {
    fontSize: 15,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#2D1B4E',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80, // offset slightly above center
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  brandName: {
    fontSize: 38,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#2D1B4E',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
  },
});
```

- [ ] **Step 2: Verify Screen 1 in simulator**

Run the app and check:
- 7 name cards float in from edges with staggered delays
- Cards bob up/down continuously with different timings
- Baby emoji bounces in with spring scale
- "bambino" title fades in after 300ms
- Tagline fades in after 500ms
- Cards are slightly rotated at various angles

- [ ] **Step 3: Commit**

```bash
git add components/onboarding/welcome-splash.tsx
git commit -m "feat(onboarding): add Screen 1 welcome splash

Floating name cards with staggered entrance and continuous bobbing,
bouncy emoji scale-in, brand title and tagline with fade animations."
```

---

### Task 3: Screen 2 — Swipe Demo

**Files:**
- Modify: `components/onboarding/swipe-demo.tsx`

**Reference:** Design spec Screen 2, mockup `screen2-swipe-v5.html`

- [ ] **Step 1: Implement the swipe demo card with animation loop**

Replace `components/onboarding/swipe-demo.tsx` with:

```tsx
import { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  interpolate,
  interpolateColor,
  Extrapolation,
  FadeIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

const { width } = Dimensions.get('window');

// Animation loop: ~5s total
// 0-1s: rest, 1-2s: swipe right, 2-3s: rest, 3-4s: swipe left, 4-5s: rest
const LOOP_DURATION = 5000;

export function SwipeDemo() {
  const { colors } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    // Progress goes 0 -> 1 over LOOP_DURATION, then repeats
    progress.value = withRepeat(
      withTiming(1, { duration: LOOP_DURATION }),
      -1, // infinite
      false, // don't reverse — loop from 0
    );
  }, []);

  // Card translateX and rotation based on progress
  const cardStyle = useAnimatedStyle(() => {
    const p = progress.value;
    // Keyframes: rest -> right -> rest -> left -> rest
    const translateX = interpolate(
      p,
      [0, 0.16, 0.28, 0.40, 0.56, 0.68, 0.80, 1.0],
      [0, 0, 50, 0, 0, -50, 0, 0],
      Extrapolation.CLAMP,
    );
    const rotate = interpolate(
      p,
      [0, 0.16, 0.28, 0.40, 0.56, 0.68, 0.80, 1.0],
      [0, 0, 6, 0, 0, -6, 0, 0],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ translateX }, { rotate: `${rotate}deg` }],
    };
  });

  // LIKE stamp opacity and scale
  const likeStampStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const opacity = interpolate(
      p,
      [0.18, 0.24, 0.28, 0.36],
      [0, 1, 1, 0],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      p,
      [0.18, 0.22, 0.26],
      [0.6, 1.15, 1],
      Extrapolation.CLAMP,
    );
    return {
      opacity,
      transform: [{ rotate: '-12deg' }, { scale }],
    };
  });

  // NOPE stamp opacity and scale
  const nopeStampStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const opacity = interpolate(
      p,
      [0.58, 0.64, 0.68, 0.76],
      [0, 1, 1, 0],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      p,
      [0.58, 0.62, 0.66],
      [0.6, 1.15, 1],
      Extrapolation.CLAMP,
    );
    return {
      opacity,
      transform: [{ rotate: '12deg' }, { scale }],
    };
  });

  // Card background flash — green on right swipe, pink on left
  const bgFlashStyle = useAnimatedStyle(() => {
    const p = progress.value;
    // Green flash during right swipe (0.18 - 0.36)
    const greenOpacity = interpolate(
      p,
      [0.18, 0.24, 0.34, 0.40],
      [0, 0.55, 0.55, 0],
      Extrapolation.CLAMP,
    );
    // Pink flash during left swipe (0.58 - 0.76)
    const pinkOpacity = interpolate(
      p,
      [0.58, 0.64, 0.74, 0.80],
      [0, 0.55, 0.55, 0],
      Extrapolation.CLAMP,
    );

    const backgroundColor = interpolateColor(
      greenOpacity > pinkOpacity ? greenOpacity : -pinkOpacity,
      [-0.55, 0, 0.55],
      ['#FF5C8A', 'transparent', '#34C77B'],
    );
    const opacity = Math.max(greenOpacity, pinkOpacity);

    return { backgroundColor, opacity };
  });

  return (
    <View style={styles.container}>
      {/* Title */}
      <Animated.Text
        entering={FadeIn.delay(200).duration(400)}
        style={styles.title}
      >
        Swipe to Decide
      </Animated.Text>

      {/* Card area */}
      <View style={styles.cardArea}>
        {/* Peek card behind */}
        <View style={[styles.peekCard, { borderColor: colors.primary }]} />

        {/* Main animated card */}
        <Animated.View
          style={[styles.demoCard, { borderColor: colors.primary }, cardStyle]}
        >
          {/* Background color flash */}
          <Animated.View style={[styles.bgFlash, bgFlashStyle]} />

          {/* LIKE stamp */}
          <Animated.View style={[styles.stamp, styles.likeStamp, likeStampStyle]}>
            <Ionicons name="heart" size={18} color="#34C77B" />
            <Text style={styles.likeStampText}>LIKE</Text>
          </Animated.View>

          {/* NOPE stamp */}
          <Animated.View style={[styles.stamp, styles.nopeStamp, nopeStampStyle]}>
            <Ionicons name="heart-dislike" size={18} color="#FF5C8A" />
            <Text style={styles.nopeStampText}>NOPE</Text>
          </Animated.View>

          {/* Card content */}
          <View style={styles.cardContent}>
            <Text style={styles.cardName}>Luna</Text>
            <View style={styles.cardUnderline} />

            <View style={styles.originRow}>
              <View style={[styles.originPill, { backgroundColor: colors.surfaceSubtle }]}>
                <Text style={styles.originText}>{'\u{1F1EE}\u{1F1F9}'} Latin</Text>
              </View>
              <View style={[styles.speakBtn, { backgroundColor: colors.surfaceSubtle }]}>
                <Ionicons name="volume-high" size={14} color="#6B5B7B" />
              </View>
            </View>

            <View style={[styles.meaningBox, { backgroundColor: colors.surfaceSubtle }]}>
              <Text style={styles.meaningText}>
                {'\u201C'}Moon{'\u201D'} {'\u2014'} associated with the Roman goddess of the moon
              </Text>
            </View>

            {/* Swipe hint */}
            <View style={styles.swipeHint}>
              <Ionicons name="chevron-back" size={12} color="#A89BB5" />
              <Text style={styles.swipeHintText}>swipe</Text>
              <Ionicons name="chevron-forward" size={12} color="#A89BB5" />
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Instruction text */}
      <Animated.View
        entering={FadeIn.delay(400).duration(400)}
        style={styles.instruction}
      >
        <Text style={styles.instructionText}>
          Swipe <Text style={styles.likeColor}>right</Text> to like,{' '}
          <Text style={styles.nopeColor}>left</Text> to pass
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    fontSize: 20,
    color: '#2D1B4E',
    textAlign: 'center',
    marginTop: 90,
  },
  cardArea: {
    marginTop: 30,
    alignItems: 'center',
    justifyContent: 'center',
    width: 240,
    height: 320,
  },
  peekCard: {
    position: 'absolute',
    top: 5,
    width: 228,
    height: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 4,
    opacity: 0.7,
  },
  demoCard: {
    width: 236,
    height: 310,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 4,
    overflow: 'hidden',
  },
  bgFlash: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
    zIndex: 1,
  },
  stamp: {
    position: 'absolute',
    top: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    zIndex: 5,
  },
  likeStamp: {
    left: 10,
    borderColor: '#34C77B',
  },
  nopeStamp: {
    right: 10,
    borderColor: '#FF5C8A',
  },
  likeStampText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#34C77B',
    letterSpacing: 2,
  },
  nopeStampText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FF5C8A',
    letterSpacing: 2,
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 28,
    zIndex: 4,
  },
  cardName: {
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    fontSize: 38,
    color: '#2D1B4E',
    lineHeight: 42,
    marginBottom: 6,
  },
  cardUnderline: {
    width: 80,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FF8FAB',
    marginBottom: 10,
  },
  originRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  originPill: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  originText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2D1B4E',
  },
  speakBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meaningBox: {
    borderRadius: 6,
    padding: 10,
  },
  meaningText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#2D1B4E',
  },
  swipeHint: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  swipeHintText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#A89BB5',
  },
  instruction: {
    marginTop: 20,
  },
  instructionText: {
    fontSize: 13,
    color: '#6B5B7B',
    fontFamily: Fonts?.sans,
    textAlign: 'center',
  },
  likeColor: {
    color: '#34C77B',
    fontWeight: '700',
  },
  nopeColor: {
    color: '#FF5C8A',
    fontWeight: '700',
  },
});
```

- [ ] **Step 2: Verify Screen 2 in simulator**

Run the app, navigate to screen 2, and check:
- Card animates right (LIKE stamp bounces in at -12deg, green flash) then back
- Card animates left (NOPE stamp bounces in at +12deg, pink flash) then back
- Loop repeats every ~5 seconds
- Peek card visible behind at 0.95 scale
- Card content matches real swipe-card design (left-aligned name, underline, origin pill with flag, speaker icon, meaning box, swipe hint)
- No up-swipe animation
- Color flashes reach 0.55 opacity

- [ ] **Step 3: Commit**

```bash
git add components/onboarding/swipe-demo.tsx
git commit -m "feat(onboarding): add Screen 2 swipe demo

Animated demo card with 5s looping right/left swipe simulation.
LIKE/NOPE stamps with bounce-in and rotation, full card color
flashes, peek card behind. Matches real swipe card design."
```

---

### Task 4: Screen 3 — Theme Picker

**Files:**
- Modify: `components/onboarding/theme-picker.tsx`

**Reference:** Design spec Screen 3, mockup `screen3-theme-picker.html`

- [ ] **Step 1: Implement the theme picker with preview card**

Replace `components/onboarding/theme-picker.tsx` with:

```tsx
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Fonts, THEME_META, CANDY_THEMES, type ThemeKey } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

const { width } = Dimensions.get('window');

// Onboarding-specific gradient backgrounds per theme (lighter/softer than app screenBg)
const ONBOARDING_BG: Record<ThemeKey, readonly [string, string, string]> = {
  pink: ['#FFF0F5', '#FFE4EC', '#F5E6FF'],
  mint: ['#F0FFF4', '#E4FFED', '#E6F5FF'],
  blue: ['#F0F5FF', '#E4ECFF', '#F5E6FF'],
  yellow: ['#FFFDF0', '#FFF8E1', '#FFF5E6'],
};

function ThemeCard({
  themeKey,
  isSelected,
  onSelect,
}: {
  themeKey: ThemeKey;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const meta = THEME_META.find((m) => m.key === themeKey)!;
  const theme = CANDY_THEMES[themeKey];

  return (
    <Pressable
      style={[
        styles.themeCard,
        isSelected && { borderColor: theme.primary },
      ]}
      onPress={onSelect}
    >
      <View style={styles.swatchWrap}>
        <LinearGradient
          colors={[...meta.previewColors]}
          style={styles.swatch}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        {isSelected && (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={14} color={theme.primary} />
          </View>
        )}
      </View>
      <Text style={styles.themeLabel}>
        {meta.emoji} {meta.name}
      </Text>
    </Pressable>
  );
}

function PreviewCard({ themeKey }: { themeKey: ThemeKey }) {
  const theme = CANDY_THEMES[themeKey];
  const meta = THEME_META.find((m) => m.key === themeKey)!;

  return (
    <View style={[styles.previewCard, { borderColor: theme.primary }]}>
      <Text style={styles.previewLabel}>Preview</Text>
      <Text style={styles.previewName}>Olivia</Text>
      <View style={[styles.previewUnderline, { backgroundColor: meta.previewColors[0] }]} />
      <View style={[styles.previewPill, { backgroundColor: theme.surfaceSubtle }]}>
        <Text style={styles.previewPillText}>{'\u{1F1EC}\u{1F1E7}'} English</Text>
      </View>
    </View>
  );
}

export function ThemePicker() {
  const { themeKey, setTheme } = useTheme();

  return (
    <View style={styles.container}>
      {/* Title */}
      <Animated.Text
        entering={FadeIn.delay(200).duration(400)}
        style={styles.title}
      >
        Pick Your Vibe
      </Animated.Text>

      {/* 2x2 theme grid */}
      <Animated.View
        entering={FadeIn.delay(300).duration(500)}
        style={styles.grid}
      >
        {(['pink', 'mint', 'blue', 'yellow'] as ThemeKey[]).map((key) => (
          <ThemeCard
            key={key}
            themeKey={key}
            isSelected={themeKey === key}
            onSelect={() => setTheme(key)}
          />
        ))}
      </Animated.View>

      {/* Preview mini-card */}
      <Animated.View
        entering={FadeIn.delay(500).duration(400)}
        style={styles.previewArea}
      >
        <PreviewCard themeKey={themeKey} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    fontSize: 20,
    color: '#2D1B4E',
    textAlign: 'center',
    marginTop: 90,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
    marginTop: 28,
    paddingHorizontal: 24,
    width: '100%',
  },
  themeCard: {
    width: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
    borderWidth: 3,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  swatchWrap: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: 46,
    height: 46,
    borderRadius: 23,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  checkBadge: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D1B4E',
    textAlign: 'center',
  },
  previewArea: {
    marginTop: 24,
    paddingHorizontal: 24,
    width: '100%',
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: '#A89BB5',
    marginBottom: 8,
  },
  previewName: {
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    fontSize: 24,
    color: '#2D1B4E',
    marginBottom: 4,
  },
  previewUnderline: {
    width: 50,
    height: 3,
    borderRadius: 2,
    marginBottom: 8,
  },
  previewPill: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  previewPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2D1B4E',
  },
});
```

- [ ] **Step 2: Update the container to react to theme changes on Screen 3**

The container's background gradient already uses `useTheme()` which auto-updates when the theme changes. The CTA button also uses `gradients.buttonPrimary`. No changes needed — verify this works automatically.

- [ ] **Step 3: Verify Screen 3 in simulator**

Run the app, navigate to screen 3, and check:
- 2x2 grid of theme cards with gradient swatch circles
- Pink is pre-selected with checkmark centered inside swatch
- Tapping a different theme:
  - Checkmark moves to new selection
  - Background gradient updates (via container's `useTheme`)
  - Preview card border, underline, and pill bg update
  - "Get Started" button gradient updates
- Preview card shows "Olivia" with current theme styling
- "Get Started" button calls `onComplete` and exits onboarding

- [ ] **Step 4: Commit**

```bash
git add components/onboarding/theme-picker.tsx
git commit -m "feat(onboarding): add Screen 3 theme picker

2x2 theme grid with gradient swatches and centered checkmark.
Live preview card shows theme applied to a name card.
Theme selection updates background, button, and preview in real-time."
```

---

### Task 5: Polish and Final Verification

**Files:**
- Modify: `components/onboarding/onboarding-screens.tsx` (minor adjustments if needed)

- [ ] **Step 1: Verify end-to-end flow**

Walk through the complete onboarding:
1. Screen 1: floating cards animate, brand reveal plays
2. Tap "Next" — screen 2 appears with swipe demo loop
3. Tap "Next" — screen 3 appears with theme picker
4. Select a theme, confirm preview updates
5. Tap "Get Started" — onboarding completes, main app shows
6. Kill and relaunch app — onboarding should NOT show again (AsyncStorage flag)

Also test:
- "Skip" button from any screen exits onboarding
- Selected theme persists after onboarding (visible in main app)

- [ ] **Step 2: Reset onboarding and test again**

In the app's Profile > Settings, use the "Reset Onboarding" option (or manually clear AsyncStorage in dev). Verify the full flow works on a second pass.

- [ ] **Step 3: Run linter**

Run: `npm run lint`

Fix any lint errors in the new/modified files.

- [ ] **Step 4: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix(onboarding): polish and lint fixes"
```

- [ ] **Step 5: Create PR**

```bash
git push -u origin HEAD
gh pr create --title "feat: onboarding redesign — 3-screen animated storybook" --body "## Summary
- Replaces 5-slide static carousel with 3-screen animated onboarding
- Screen 1: Welcome Splash — floating name cards, brand reveal
- Screen 2: Swipe Demo — animated card teaching swipe mechanics
- Screen 3: Pick Your Vibe — theme picker with live preview

## Design spec
docs/superpowers/specs/2026-03-28-onboarding-redesign-design.md

## Test plan
- [ ] Fresh install: onboarding shows, all 3 screens work
- [ ] Skip button exits from any screen
- [ ] Theme selection persists after onboarding
- [ ] Onboarding doesn't show again after completion
- [ ] Reset onboarding and verify it shows again"
```
