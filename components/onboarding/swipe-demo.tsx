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

const { width, height } = Dimensions.get('window');

// Card fills available width with padding, height uses remaining screen space
const CARD_H_PADDING = 48; // 24px each side
const CARD_WIDTH = width - CARD_H_PADDING;
// Reserve space for: title (~80), instruction (~40), bottom controls (~120), extra padding (~40)
const CARD_HEIGHT = height - 310;

// Animation loop: ~5s total
// 0-0.8s: swipe right, 0.8-1.6s: rest, 1.6-2.4s: swipe left, 2.4-3.2s: rest, 3.2-5s: rest
const LOOP_DURATION = 5000;

export function SwipeDemo({ isActive }: { isActive: boolean }) {
  const { colors } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!isActive) return;
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: LOOP_DURATION }),
      -1, // infinite
      false, // don't reverse — loop from 0
    );
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Card translateX and rotation based on progress
  // Starts swiping right immediately (no leading rest phase)
  const cardStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const translateX = interpolate(
      p,
      [0, 0.12, 0.24, 0.40, 0.52, 0.64, 1.0],
      [0, 100, 0, 0, -100, 0, 0],
      Extrapolation.CLAMP,
    );
    const rotate = interpolate(
      p,
      [0, 0.12, 0.24, 0.40, 0.52, 0.64, 1.0],
      [0, 8, 0, 0, -8, 0, 0],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ translateX }, { rotate: `${rotate}deg` }],
    };
  });

  // LIKE stamp opacity and scale
  const likeStampStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const opacity = interpolate(p, [0.04, 0.08, 0.12, 0.20], [0, 1, 1, 0], Extrapolation.CLAMP);
    const scale = interpolate(p, [0.04, 0.07, 0.10], [0.6, 1.15, 1], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ rotate: '-12deg' }, { scale }],
    };
  });

  // NOPE stamp opacity and scale
  const nopeStampStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const opacity = interpolate(p, [0.44, 0.48, 0.52, 0.60], [0, 1, 1, 0], Extrapolation.CLAMP);
    const scale = interpolate(p, [0.44, 0.47, 0.50], [0.6, 1.15, 1], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ rotate: '12deg' }, { scale }],
    };
  });

  // Card background flash — green on right swipe, pink on left
  const bgFlashStyle = useAnimatedStyle(() => {
    const p = progress.value;
    // Green flash during right swipe (starts immediately)
    const greenOpacity = interpolate(
      p,
      [0.04, 0.08, 0.18, 0.24],
      [0, 0.55, 0.55, 0],
      Extrapolation.CLAMP,
    );
    // Pink flash during left swipe
    const pinkOpacity = interpolate(
      p,
      [0.44, 0.48, 0.58, 0.64],
      [0, 0.55, 0.55, 0],
      Extrapolation.CLAMP,
    );

    const backgroundColor = interpolateColor(
      greenOpacity > pinkOpacity ? greenOpacity : -pinkOpacity,
      [-0.55, 0, 0.55],
      ['#FF5C8A', 'rgba(0,0,0,0)', '#34C77B'],
    );
    const opacity = Math.max(greenOpacity, pinkOpacity);

    return { backgroundColor, opacity };
  });

  // Card text fades out during swipes, returns at rest
  const contentFadeStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const fade = interpolate(
      p,
      [0, 0.04, 0.12, 0.20, 0.24, 0.40, 0.44, 0.52, 0.60, 0.64, 1.0],
      [1, 0.3, 0.3, 0.3, 1, 1, 0.3, 0.3, 0.3, 1, 1],
      Extrapolation.CLAMP,
    );
    return { opacity: fade };
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
            <Ionicons name="heart" size={22} color="#34C77B" />
            <Text style={styles.likeStampText}>LIKE</Text>
          </Animated.View>

          {/* NOPE stamp */}
          <Animated.View style={[styles.stamp, styles.nopeStamp, nopeStampStyle]}>
            <Ionicons name="heart-dislike" size={22} color="#FF5C8A" />
            <Text style={styles.nopeStampText}>NOPE</Text>
          </Animated.View>

          {/* Card content — fades during swipes */}
          <Animated.View style={[styles.cardContent, contentFadeStyle]}>
            <Text style={styles.cardName}>Aurora</Text>
            <View style={styles.cardUnderline} />

            <View style={styles.originRow}>
              <View style={[styles.originPill, { backgroundColor: colors.surfaceSubtle }]}>
                <Text style={styles.originText}>{'\u{1F1EE}\u{1F1F9}'} Latin</Text>
              </View>
              <View style={[styles.speakBtn, { backgroundColor: colors.surfaceSubtle }]}>
                <Ionicons name="volume-high" size={18} color="#6B5B7B" />
              </View>
            </View>

            <View style={[styles.meaningBox, { backgroundColor: colors.surfaceSubtle }]}>
              <Text style={styles.meaningText}>
                {'\u201C'}Dawn{'\u201D'} {'\u2014'} the Roman goddess of sunrise, whose tears became the morning dew
              </Text>
            </View>

            {/* Swipe hint */}
            <View style={styles.swipeHint}>
              <Ionicons name="chevron-back" size={12} color="#A89BB5" />
              <Text style={styles.swipeHintText}>swipe</Text>
              <Ionicons name="chevron-forward" size={12} color="#A89BB5" />
            </View>
          </Animated.View>
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
    marginTop: 76,
  },
  cardArea: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: CARD_WIDTH + 12,
    height: CARD_HEIGHT + 10,
  },
  peekCard: {
    position: 'absolute',
    width: CARD_WIDTH - 12,
    height: CARD_HEIGHT - 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 4,
    opacity: 0.7,
    top: 0,
  },
  demoCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
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
    top: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    zIndex: 5,
  },
  likeStamp: {
    left: 14,
    borderColor: '#34C77B',
  },
  nopeStamp: {
    right: 14,
    borderColor: '#FF5C8A',
  },
  likeStampText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#34C77B',
    letterSpacing: 2,
  },
  nopeStampText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FF5C8A',
    letterSpacing: 2,
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    zIndex: 4,
  },
  cardName: {
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    fontSize: 52,
    color: '#2D1B4E',
    lineHeight: 58,
    marginBottom: 8,
  },
  cardUnderline: {
    width: 100,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#FF8FAB',
    marginBottom: 16,
  },
  originRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  originPill: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  originText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D1B4E',
  },
  speakBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meaningBox: {
    borderRadius: 10,
    padding: 16,
  },
  meaningText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#2D1B4E',
  },
  swipeHint: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  swipeHintText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#A89BB5',
  },
  instruction: {
    marginTop: 12,
  },
  instructionText: {
    fontSize: 16,
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
