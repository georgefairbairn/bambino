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

const { width } = Dimensions.get('window');

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- shared value assigned once on mount

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { rotate: `${card.rotation}deg` }],
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- shared value assigned once on mount

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
        <Animated.Text style={[styles.emoji, emojiStyle]}>{'\u{1F476}'}</Animated.Text>

        <Animated.Text entering={FadeIn.delay(300).duration(400)} style={styles.brandName}>
          bambino
        </Animated.Text>

        <Animated.Text entering={FadeIn.delay(500).duration(400)} style={styles.tagline}>
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
