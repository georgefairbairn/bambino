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
  'Luna',
  'Olivia',
  'Liam',
  'Emma',
  'Noah',
  'Sophia',
  'Milo',
  'Aria',
  'Leo',
  'Isla',
  'Finn',
  'Ella',
  'Rex',
  'Ivy',
  'Hugo',
  'Lily',
  'Ezra',
  'Nora',
  'Theo',
  'Ruby',
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const emojiStyle = useAnimatedStyle(() => ({
    opacity: emojiOpacity.value,
    transform: [{ translateY: emojiTranslateY.value }, { scale: emojiScale.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  const brandingGroupStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: brandingTranslateY.value }, { scale: brandingScale.value }],
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
