import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { SWIPE_COLORS } from '@/constants/swipe';

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
const PILL_SPAWN_MIN = 600;
const PILL_SPAWN_MAX = 1000;
const INITIAL_SPAWN_MIN = 1200;
const INITIAL_SPAWN_MAX = 1800;
const INITIAL_PILL_COUNT = 5;
const PILL_RISE_DURATION = 8000;
const PILL_FADE_DURATION = 1800;
const BADGE_DELAY = 300;
const BOTTOM_ZONE = 140;

interface PillConfig {
  id: number;
  name: string;
  startX: number;
  rotation: number;
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

export function BubblePillsBackground() {
  const isFocused = useIsFocused();
  if (!isFocused) return null;
  return <BubblePillsBackgroundInner />;
}

function BubblePillsBackgroundInner() {
  const [pills, setPills] = useState<PillConfig[]>([]);
  const nextId = useRef(0);
  const spawnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const removePill = useCallback((id: number) => {
    setPills((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const spawnPill = useCallback(() => {
    setPills((prev) => {
      if (prev.length >= MAX_PILLS) return prev;

      const usedNames = new Set(prev.map((p) => p.name));
      const available = NAME_POOL.filter((n) => !usedNames.has(n));
      const pool = available.length > 0 ? available : NAME_POOL;
      const name = pool[Math.floor(Math.random() * pool.length)];
      const startX = 20 + Math.random() * (SCREEN_WIDTH - 140);
      const rotation = (Math.random() - 0.5) * 12;
      const isLike = Math.random() > 0.5;
      const isSmall = Math.random() > 0.65;
      const badgeOnLeft = Math.random() > 0.5;
      const id = nextId.current++;

      return [...prev, { id, name, startX, rotation, isLike, isSmall, badgeOnLeft }];
    });
  }, []);

  const spawnCount = useRef(0);

  const scheduleNextSpawn = useCallback(() => {
    const isInitial = spawnCount.current < INITIAL_PILL_COUNT;
    const min = isInitial ? INITIAL_SPAWN_MIN : PILL_SPAWN_MIN;
    const max = isInitial ? INITIAL_SPAWN_MAX : PILL_SPAWN_MAX;
    const delay = min + Math.random() * (max - min);
    spawnTimer.current = setTimeout(() => {
      if (!mountedRef.current) return;
      spawnPill();
      spawnCount.current++;
      scheduleNextSpawn();
    }, delay);
  }, [spawnPill]);

  useEffect(() => {
    mountedRef.current = true;
    spawnPill();
    spawnCount.current = 1;
    scheduleNextSpawn();

    return () => {
      mountedRef.current = false;
      if (spawnTimer.current) clearTimeout(spawnTimer.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={styles.container} pointerEvents="none">
      {pills.map((pill) => (
        <BubblePill key={pill.id} config={pill} onComplete={removePill} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
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
