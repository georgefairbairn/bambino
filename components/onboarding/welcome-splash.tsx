import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { SWIPE_COLORS } from '@/constants/swipe';
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

const MAX_PILLS = 14;
const PILL_SPAWN_MIN = 600; // ms
const PILL_SPAWN_MAX = 1000; // ms
const PILL_RISE_DURATION = 8000; // ms for full rise from bottom to top
const PILL_FADE_DURATION = 2800; // ms — pills fade out well before reaching branding
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
  badgeOnLeft: boolean;
}

function BubblePill({
  config,
  onComplete,
}: {
  config: PillConfig;
  onComplete: (id: number) => void;
}) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0.95);
  const badgeOpacity = useSharedValue(0);

  useEffect(() => {
    const riseDistance = SCREEN_HEIGHT - BOTTOM_ZONE;
    translateY.value = withTiming(
      -riseDistance,
      { duration: PILL_RISE_DURATION, easing: Easing.linear },
      (finished) => {
        if (finished) runOnJS(onComplete)(config.id);
      },
    );

    opacity.value = withTiming(0, {
      duration: PILL_FADE_DURATION,
      easing: Easing.in(Easing.quad),
    });

    badgeOpacity.value = withDelay(BADGE_DELAY, withTiming(1, { duration: 250 }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pillStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { rotate: `${config.rotation}deg` }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: badgeOpacity.value,
  }));

  const badgeColor = config.isLike ? SWIPE_COLORS.like : SWIPE_COLORS.nope;
  const badgeIcon = config.isLike ? 'heart' : 'heart-dislike';
  const badgeLabel = config.isLike ? 'LIKE' : 'NOPE';

  return (
    <Animated.View
      style={[
        styles.pill,
        config.isSmall && styles.pillSmall,
        {
          left: config.startX,
          bottom: BOTTOM_ZONE,
          borderColor: badgeColor,
          borderWidth: 1,
          shadowColor: badgeColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.45,
          shadowRadius: 7,
        },
        pillStyle,
      ]}
    >
      <Text style={[styles.pillText, config.isSmall && styles.pillTextSmall]}>{config.name}</Text>

      {/* Badge: miniature LIKE/NOPE stamp */}
      <Animated.View
        style={[
          styles.badge,
          { borderColor: badgeColor },
          config.badgeOnLeft ? { left: -8 } : { right: -8 },
          badgeStyle,
        ]}
      >
        <Ionicons name={badgeIcon} size={10} color={badgeColor} />
        <Text numberOfLines={1} style={[styles.badgeText, { color: badgeColor }]}>
          {badgeLabel}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

export function WelcomeSplash({ isActive }: { isActive: boolean }) {
  const { colors } = useTheme();

  // Phase 1: Emoji entrance — fade up + scale bounce
  const emojiOpacity = useSharedValue(0);
  const emojiScale = useSharedValue(0);
  const emojiTranslateY = useSharedValue(30);

  // Phase 1: Title + tagline fade-in
  const titleOpacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);

  // Phase 3: Pill spawning
  const [pills, setPills] = useState<PillConfig[]>([]);
  const nextId = useRef(0);
  const spawnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const removePill = useCallback((id: number) => {
    setPills((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const spawnPill = useCallback(() => {
    const id = nextId.current++;
    setPills((prev) => {
      if (prev.length >= MAX_PILLS) return prev; // cap at 8

      // Avoid names already visible on screen
      const usedNames = new Set(prev.map((p) => p.name));
      const available = NAME_POOL.filter((n) => !usedNames.has(n));
      const pool = available.length > 0 ? available : NAME_POOL;
      const name = pool[Math.floor(Math.random() * pool.length)];
      // Random X: leave 20px margin on each side, account for pill width (~100px)
      const startX = 20 + Math.random() * (SCREEN_WIDTH - 140);
      const rotation = (Math.random() - 0.5) * 12; // -6 to +6 degrees
      const isLike = Math.random() > 0.5;
      const isSmall = Math.random() > 0.65; // ~35% chance of small variant
      const badgeOnLeft = Math.random() > 0.5;

      return [...prev, { id, name, startX, rotation, isLike, isSmall, badgeOnLeft }];
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

  // Start pill spawning when Phase 3 begins
  useEffect(() => {
    // Pills start after Phase 1 entrance completes (~0.9s)
    const startDelay = setTimeout(() => {
      spawnPill(); // First pill immediately
      scheduleNextSpawn(); // Then continuous spawning
    }, 900);

    return () => {
      clearTimeout(startDelay);
      if (spawnTimer.current) clearTimeout(spawnTimer.current);
    };
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

  return (
    <View style={styles.container}>
      <View style={styles.brandingCenter}>
        <Animated.Text style={[styles.emoji, emojiStyle]}>{'\u{1F476}'}</Animated.Text>
        <Animated.Text style={[styles.brandName, { color: colors.primary }, titleStyle]}>
          bambino
        </Animated.Text>
        <Animated.Text style={[styles.tagline, taglineStyle]}>
          Find the perfect name, together.
        </Animated.Text>
      </View>

      {/* Bubbling pills */}
      {pills.map((pill) => (
        <BubblePill key={pill.id} config={pill} onComplete={removePill} />
      ))}
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
    paddingBottom: 200,
    zIndex: 10,
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
  pill: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 22,
  },
  pillSmall: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
  },
  pillText: {
    fontSize: 17,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#2D1B4E',
  },
  pillTextSmall: {
    fontSize: 14,
  },
  badge: {
    position: 'absolute',
    top: -13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    minWidth: 50,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 2.5,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
});
