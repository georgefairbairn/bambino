import { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
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
      [0, 0.16, 0.28, 0.4, 0.56, 0.68, 0.8, 1.0],
      [0, 0, 50, 0, 0, -50, 0, 0],
      Extrapolation.CLAMP,
    );
    const rotate = interpolate(
      p,
      [0, 0.16, 0.28, 0.4, 0.56, 0.68, 0.8, 1.0],
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
    const opacity = interpolate(p, [0.18, 0.24, 0.28, 0.36], [0, 1, 1, 0], Extrapolation.CLAMP);
    const scale = interpolate(p, [0.18, 0.22, 0.26], [0.6, 1.15, 1], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ rotate: '-12deg' }, { scale }],
    };
  });

  // NOPE stamp opacity and scale
  const nopeStampStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const opacity = interpolate(p, [0.58, 0.64, 0.68, 0.76], [0, 1, 1, 0], Extrapolation.CLAMP);
    const scale = interpolate(p, [0.58, 0.62, 0.66], [0.6, 1.15, 1], Extrapolation.CLAMP);
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
      [0.18, 0.24, 0.34, 0.4],
      [0, 0.55, 0.55, 0],
      Extrapolation.CLAMP,
    );
    // Pink flash during left swipe (0.58 - 0.76)
    const pinkOpacity = interpolate(
      p,
      [0.58, 0.64, 0.74, 0.8],
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
      <Animated.Text entering={FadeIn.delay(200).duration(400)} style={styles.title}>
        Swipe to Decide
      </Animated.Text>

      {/* Card area */}
      <View style={styles.cardArea}>
        {/* Peek card behind */}
        <View style={[styles.peekCard, { borderColor: colors.primary }]} />

        {/* Main animated card */}
        <Animated.View style={[styles.demoCard, { borderColor: colors.primary }, cardStyle]}>
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
      <Animated.View entering={FadeIn.delay(400).duration(400)} style={styles.instruction}>
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
