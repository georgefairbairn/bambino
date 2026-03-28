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
