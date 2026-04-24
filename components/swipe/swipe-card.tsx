import { forwardRef, useImperativeHandle, useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, LayoutChangeEvent } from 'react-native';
import * as Speech from 'expo-speech';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  interpolateColor,
  withTiming,
  withDelay,
  withSpring,
  withRepeat,
  withSequence,
  runOnJS,
  Extrapolation,
  cancelAnimation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, TouchableOpacity } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { Doc } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import { LineChart } from 'react-native-gifted-charts';
import { useCardAnimation } from '@/hooks/use-card-animation';
import { useSwipeGesture } from '@/hooks/use-swipe-gesture';
import { useVoiceSettings } from '@/contexts/voice-settings-context';
import { CARD_WIDTH, CARD_HEIGHT_FULL, SWIPE_THRESHOLD, SWIPE_COLORS } from '@/constants/swipe';
import { Fonts } from '@/constants/theme';
import { getOriginFlag } from '@/constants/origins';
import { useTheme } from '@/contexts/theme-context';
import { GenderBadge } from '@/components/name-detail/gender-badge';
import * as Sentry from '@sentry/react-native';

export interface SwipeCardRef {
  swipeLeft: () => void;
  swipeRight: () => void;
}

interface SwipeCardProps {
  name: Doc<'names'>;
  isTop: boolean;
  showSwipeHint?: boolean;
  onSwipeHintShown?: () => void;
  onSwipeHintReset?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeComplete?: (direction: 'left' | 'right') => void;
  onDetailPress?: () => void;
  swipeEnabled?: boolean;
  detailOpen?: boolean;
}

// Gender-based underline colors
const UNDERLINE_COLORS = {
  male: '#7CB9E8', // sky blue
  female: '#FF8FAB', // candy pink
  neutral: '#C4A7E7', // soft purple
};

const GENDER_MAP: Record<string, 'boy' | 'girl' | 'unisex'> = {
  male: 'boy',
  female: 'girl',
  neutral: 'unisex',
};

const TREND_CONFIG = {
  rising: { label: 'Rising', arrow: '↑', color: '#4ADE80' },
  falling: { label: 'Falling', arrow: '↓', color: '#FF6B6B' },
  steady: { label: 'Steady', arrow: '→', color: '#A89BB5' },
};

function getNameFontSize(name: string): number {
  const len = name.length;
  if (len <= 8) return 56;
  if (len <= 11) return 46;
  if (len <= 14) return 42;
  return 32;
}

export const SwipeCard = forwardRef<SwipeCardRef, SwipeCardProps>(function SwipeCard(
  {
    name,
    isTop,
    showSwipeHint = true,
    onSwipeHintShown,
    onSwipeHintReset,
    onSwipeLeft,
    onSwipeRight,
    onSwipeComplete,
    onDetailPress,
    swipeEnabled = true,
    detailOpen = false,
  },
  ref,
) {
  const { colors } = useTheme();

  // Fetch popularity summary only for the top (visible) card
  const popularitySummary = useQuery(
    api.popularity.getNamePopularitySummary,
    isTop ? { name: name.name, gender: name.gender } : 'skip',
  );

  const {
    translateX,
    translateY,
    updatePosition,
    resetPosition,
    swipeLeft,
    swipeRight,
    swipeLeftFromJS,
    swipeRightFromJS,
    cardAnimatedStyle,
  } = useCardAnimation({ onSwipeComplete });

  // Expose JS-callable swipe methods to parent via ref
  useImperativeHandle(ref, () => ({
    swipeLeft: swipeLeftFromJS,
    swipeRight: swipeRightFromJS,
  }));

  const { panGesture } = useSwipeGesture({
    translateX,
    translateY,
    updatePosition,
    resetPosition,
    swipeLeft,
    swipeRight,
    onSwipeLeft,
    onSwipeRight,
    enabled: isTop && swipeEnabled,
  });

  // Animated style to fade content during swipe
  const contentOpacityStyle = useAnimatedStyle(() => {
    const progress = Math.abs(translateX.value) / SWIPE_THRESHOLD;
    return {
      opacity: interpolate(progress, [0, 0.5], [1, 0], Extrapolation.CLAMP),
    };
  });

  // Like overlay - only shows when swiping RIGHT (positive translateX)
  // Ramps fast: 85% opacity at 40% swipe so the label is readable early
  const likeOverlayStyle = useAnimatedStyle(() => {
    const progress = translateX.value / SWIPE_THRESHOLD;
    return {
      opacity: interpolate(progress, [0, 0.1, 0.25], [0, 0.5, 1], Extrapolation.CLAMP),
    };
  });

  // Like stamp icon bounce — scales up with a slight overshoot
  const likeStampStyle = useAnimatedStyle(() => {
    const progress = translateX.value / SWIPE_THRESHOLD;
    const scale = interpolate(
      progress,
      [0, 0.2, 0.5, 0.7],
      [0.6, 0.8, 1.2, 1],
      Extrapolation.CLAMP,
    );
    const rotate = interpolate(progress, [0, 0.3, 0.6], [0, -8, 0], Extrapolation.CLAMP);
    return {
      transform: [{ scale }, { rotate: `${rotate}deg` }],
    };
  });

  // Dislike overlay - only shows when swiping LEFT (negative translateX)
  // Same fast ramp as like overlay
  const dislikeOverlayStyle = useAnimatedStyle(() => {
    const progress = -translateX.value / SWIPE_THRESHOLD;
    return {
      opacity: interpolate(progress, [0, 0.1, 0.25], [0, 0.5, 1], Extrapolation.CLAMP),
    };
  });

  // Dislike stamp icon bounce — mirrors the like animation
  const dislikeStampStyle = useAnimatedStyle(() => {
    const progress = -translateX.value / SWIPE_THRESHOLD;
    const scale = interpolate(
      progress,
      [0, 0.2, 0.5, 0.7],
      [0.6, 0.8, 1.2, 1],
      Extrapolation.CLAMP,
    );
    const rotate = interpolate(progress, [0, 0.3, 0.6], [0, 8, 0], Extrapolation.CLAMP);
    return {
      transform: [{ scale }, { rotate: `${rotate}deg` }],
    };
  });

  // Animated border that fades out during swipe
  const cardBorderStyle = useAnimatedStyle(() => {
    const progress = Math.abs(translateX.value) / SWIPE_THRESHOLD;
    return {
      borderWidth: interpolate(progress, [0, 0.5], [5, 0], Extrapolation.CLAMP),
      borderColor: interpolateColor(progress, [0, 0.5], [colors.primary, 'transparent']),
    };
  });

  // Gradient backgrounds: fade in a top-to-bottom gradient based on swipe direction
  const likeGradientStyle = useAnimatedStyle(() => {
    const progress = translateX.value / SWIPE_THRESHOLD;
    return {
      opacity: interpolate(progress, [0, 0.3, 1], [0, 0.5, 1], Extrapolation.CLAMP),
    };
  });

  const nopeGradientStyle = useAnimatedStyle(() => {
    const progress = -translateX.value / SWIPE_THRESHOLD;
    return {
      opacity: interpolate(progress, [0, 0.3, 1], [0, 0.5, 1], Extrapolation.CLAMP),
    };
  });

  const underlineColor =
    UNDERLINE_COLORS[name.gender as keyof typeof UNDERLINE_COLORS] || UNDERLINE_COLORS.neutral;

  // Track name width for underline animation
  const [nameWidth, setNameWidth] = useState(0);
  const hasAnimated = useRef(false);

  const handleNameLayout = (event: LayoutChangeEvent) => {
    setNameWidth(event.nativeEvent.layout.width);
  };

  // Animated underline width for left-to-right reveal (runs only once)
  const underlineWidth = useSharedValue(0);

  // Staggered content entrance animations
  const originOpacity = useSharedValue(0);
  const originTranslateY = useSharedValue(12);
  const meaningOpacity = useSharedValue(0);
  const meaningTranslateY = useSharedValue(12);
  const popularityOpacity = useSharedValue(0);
  const popularityTranslateY = useSharedValue(12);

  useEffect(() => {
    if (isTop && nameWidth > 0 && !hasAnimated.current) {
      hasAnimated.current = true;
      underlineWidth.value = 0;
      underlineWidth.value = withTiming(nameWidth, { duration: 400 });

      // Stagger origin pill entrance
      originOpacity.value = withDelay(250, withTiming(1, { duration: 350 }));
      originTranslateY.value = withDelay(250, withSpring(0, { damping: 15, stiffness: 150 }));

      // Stagger meaning box entrance
      meaningOpacity.value = withDelay(400, withTiming(1, { duration: 350 }));
      meaningTranslateY.value = withDelay(400, withSpring(0, { damping: 15, stiffness: 150 }));

      // Stagger popularity row entrance
      popularityOpacity.value = withDelay(550, withTiming(1, { duration: 350 }));
      popularityTranslateY.value = withDelay(550, withSpring(0, { damping: 15, stiffness: 150 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTop, nameWidth]);

  const underlineAnimatedStyle = useAnimatedStyle(() => ({
    width: underlineWidth.value,
  }));

  const originAnimatedStyle = useAnimatedStyle(() => ({
    opacity: originOpacity.value,
    transform: [{ translateY: originTranslateY.value }],
  }));

  const meaningAnimatedStyle = useAnimatedStyle(() => ({
    opacity: meaningOpacity.value,
    transform: [{ translateY: meaningTranslateY.value }],
  }));

  const popularityAnimatedStyle = useAnimatedStyle(() => ({
    opacity: popularityOpacity.value,
    transform: [{ translateY: popularityTranslateY.value }],
  }));

  // Swipe hint animation — appears after 10s of idle on top card
  const hintOpacity = useSharedValue(0);
  const hintTranslateX = useSharedValue(0);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hintActivatedRef = useRef(false);

  // Reset hint when detail view opens so it doesn't show statically behind the modal
  useEffect(() => {
    if (detailOpen && hintActivatedRef.current) {
      cancelAnimation(hintOpacity);
      cancelAnimation(hintTranslateX);
      hintOpacity.value = 0;
      hintTranslateX.value = 0;
      hintActivatedRef.current = false;
      onSwipeHintReset?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailOpen]);

  useEffect(() => {
    if (!isTop || !showSwipeHint || hintActivatedRef.current || detailOpen) return;

    hintTimerRef.current = setTimeout(() => {
      hintActivatedRef.current = true;
      hintOpacity.value = withTiming(1, { duration: 400 });
      hintTranslateX.value = withRepeat(
        withSequence(withTiming(-14, { duration: 600 }), withTiming(14, { duration: 600 })),
        -1,
        true,
      );
      onSwipeHintShown?.();
    }, 10000);

    return () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      if (!hintActivatedRef.current) return;
      cancelAnimation(hintOpacity);
      cancelAnimation(hintTranslateX);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTop, showSwipeHint, detailOpen]);

  // Hide hint as soon as user starts swiping
  const hintContainerStyle = useAnimatedStyle(() => {
    const swipeProgress = Math.abs(translateX.value) / SWIPE_THRESHOLD;
    return {
      opacity: interpolate(swipeProgress, [0, 0.05], [hintOpacity.value, 0], Extrapolation.CLAMP),
    };
  });

  const hintArrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: hintTranslateX.value }],
  }));

  // Text-to-speech state and handler
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { getBestVoice } = useVoiceSettings();

  const handleReadName = useCallback(async () => {
    try {
      const currentlySpeaking = await Speech.isSpeakingAsync();
      if (currentlySpeaking) {
        await Speech.stop();
        setIsSpeaking(false);
        return;
      }

      const voice = await getBestVoice();
      setIsSpeaking(true);
      Speech.speak(name.name, {
        voice,
        rate: 0.9,
        pitch: 1.0,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    } catch (error) {
      Sentry.captureException(error);
      setIsSpeaking(false);
    }
  }, [name.name, getBestVoice]);

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.card,
          { borderColor: colors.primary },
          isTop && cardAnimatedStyle,
          isTop && cardBorderStyle,
          { zIndex: isTop ? 2 : 1 },
        ]}
      >
        {/* Gradient backgrounds — top-to-bottom color wash on swipe */}
        {isTop && (
          <Animated.View style={[StyleSheet.absoluteFill, likeGradientStyle]} pointerEvents="none">
            <LinearGradient
              colors={[SWIPE_COLORS.like, '#A3E4C4']}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        )}
        {isTop && (
          <Animated.View style={[StyleSheet.absoluteFill, nopeGradientStyle]} pointerEvents="none">
            <LinearGradient
              colors={[SWIPE_COLORS.nope, '#FFB3C6']}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        )}

        {/* LIKE overlay - shows when swiping right */}
        <Animated.View
          style={[styles.overlay, styles.likeOverlay, likeOverlayStyle]}
          pointerEvents="none"
        >
          <Animated.View style={[styles.likeStamp, likeStampStyle]}>
            <Ionicons name="heart" size={24} color="#34C77B" />
            <Text style={styles.likeStampText}>LIKE</Text>
          </Animated.View>
        </Animated.View>

        {/* DISLIKE overlay - shows when swiping left */}
        <Animated.View
          style={[styles.overlay, styles.dislikeOverlay, dislikeOverlayStyle]}
          pointerEvents="none"
        >
          <Animated.View style={[styles.dislikeStamp, dislikeStampStyle]}>
            <Ionicons name="heart-dislike" size={24} color="#FF5C8A" />
            <Text style={styles.dislikeStampText}>NOPE</Text>
          </Animated.View>
        </Animated.View>

        {/* Card content - fades out during swipe */}
        <Animated.View style={[styles.content, isTop && contentOpacityStyle]}>
          {/* Gender badge */}
          <View style={styles.genderBadgeRow}>
            <GenderBadge gender={GENDER_MAP[name.gender] ?? 'unisex'} size="large" />
          </View>

          {/* Name */}
          <Text
            style={[styles.name, { fontSize: getNameFontSize(name.name) }]}
            onLayout={handleNameLayout}
          >
            {name.name}
          </Text>

          {/* Gender-based underline with animated reveal */}
          <Animated.View
            style={[styles.underline, { backgroundColor: underlineColor }, underlineAnimatedStyle]}
          />

          {/* Origin row with pill and speak button */}
          <Animated.View style={[styles.originRow, isTop && originAnimatedStyle]}>
            {name.origin && (
              <View style={[styles.originPill, { backgroundColor: colors.surfaceSubtle }]}>
                <Text style={styles.originText}>
                  {getOriginFlag(name.origin)} {name.origin}
                </Text>
              </View>
            )}
            <TouchableOpacity
              onPress={handleReadName}
              style={[styles.speakButton, { backgroundColor: colors.surfaceSubtle }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
              accessibilityLabel="Pronounce name"
              accessibilityRole="button"
            >
              <Ionicons
                name={isSpeaking ? 'volume-high' : 'volume-medium'}
                size={24}
                color={isSpeaking ? colors.primary : '#6B5B7B'}
              />
            </TouchableOpacity>
          </Animated.View>

          {/* Meaning box */}
          {name.meaning && (
            <Animated.View
              style={[
                styles.meaningBox,
                { backgroundColor: colors.surfaceSubtle },
                isTop && meaningAnimatedStyle,
              ]}
            >
              <ScrollView showsVerticalScrollIndicator nestedScrollEnabled bounces={false}>
                <Text style={styles.meaningText}>{name.meaning}</Text>
              </ScrollView>
            </Animated.View>
          )}

          {/* Swipe hint — vertically centered in the whitespace between content and rank row */}
          {isTop && (
            <Animated.View style={[styles.swipeHint, hintContainerStyle]} pointerEvents="none">
              <Animated.View style={[styles.swipeHintInner, hintArrowStyle]}>
                <Ionicons name="chevron-back" size={18} color="#A89BB5" />
                <Text style={styles.swipeHintText}>swipe</Text>
                <Ionicons name="chevron-forward" size={18} color="#A89BB5" />
              </Animated.View>
            </Animated.View>
          )}

          {/* Popularity row — pinned to bottom; tappable to open detail */}
          <GestureDetector
            gesture={Gesture.Tap().onEnd(() => {
              'worklet';
              if (onDetailPress) runOnJS(onDetailPress)();
            })}
          >
            <Animated.View style={[styles.popularityRow, isTop && popularityAnimatedStyle]}>
              {/* Rank tile */}
              <View style={[styles.statTile, { backgroundColor: colors.surfaceSubtle }]}>
                <Text style={styles.statLabel}>RANK</Text>
                {name.currentRank ? (
                  <Text style={styles.statValueRank}>#{name.currentRank}</Text>
                ) : (
                  <Text style={styles.statValueMuted}>Unranked</Text>
                )}
              </View>

              {name.meaning ? (
                // Two-tile layout: rank + sparkline
                <View style={[styles.sparklineTile, { backgroundColor: colors.surfaceSubtle }]}>
                  <Text style={styles.statLabel}>10 YEAR TREND</Text>
                  <View style={styles.sparklineRow}>
                    {popularitySummary && popularitySummary.sparklinePoints.length > 1 ? (
                      <>
                        <View style={styles.sparklineChart}>
                          <LineChart
                            data={popularitySummary.sparklinePoints.map((value) => ({ value }))}
                            width={80}
                            height={28}
                            hideDataPoints
                            hideYAxisText
                            hideAxesAndRules
                            color={underlineColor}
                            thickness={2}
                            curved
                            initialSpacing={0}
                            endSpacing={0}
                            spacing={80 / Math.max(popularitySummary.sparklinePoints.length - 1, 1)}
                            disableScroll
                            adjustToWidth
                            isAnimated={false}
                          />
                        </View>
                        {popularitySummary.trend && (
                          <Text
                            style={[
                              styles.trendArrow,
                              { color: TREND_CONFIG[popularitySummary.trend].color },
                            ]}
                          >
                            {TREND_CONFIG[popularitySummary.trend].arrow}
                          </Text>
                        )}
                      </>
                    ) : (
                      <Text style={styles.noTrendText}>No trend data</Text>
                    )}
                  </View>
                </View>
              ) : (
                // Three-tile fallback: rank + trend + peak (no meaning box shown)
                <>
                  <View style={[styles.statTile, { backgroundColor: colors.surfaceSubtle }]}>
                    <Text style={styles.statLabel}>TREND</Text>
                    {popularitySummary?.trend ? (
                      <Text
                        style={[
                          styles.statValueTrend,
                          { color: TREND_CONFIG[popularitySummary.trend].color },
                        ]}
                      >
                        {TREND_CONFIG[popularitySummary.trend].label}
                      </Text>
                    ) : (
                      <Text style={styles.statValueMuted}>—</Text>
                    )}
                  </View>
                  <View style={[styles.statTile, { backgroundColor: colors.surfaceSubtle }]}>
                    <Text style={styles.statLabel}>PEAK</Text>
                    {popularitySummary?.peakYear ? (
                      <Text style={styles.statValuePeak}>{popularitySummary.peakYear}</Text>
                    ) : (
                      <Text style={styles.statValueMuted}>—</Text>
                    )}
                  </View>
                </>
              )}
            </Animated.View>
          </GestureDetector>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT_FULL,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 5,
    position: 'absolute',
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    borderRadius: 13,
  },
  likeOverlay: {
    backgroundColor: 'transparent',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  dislikeOverlay: {
    backgroundColor: 'transparent',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  likeStamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    margin: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 4,
    borderColor: '#34C77B',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  dislikeStamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    margin: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 4,
    borderColor: '#FF5C8A',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  likeStampText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#34C77B',
    letterSpacing: 3,
  },
  dislikeStampText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FF5C8A',
    letterSpacing: 3,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
  },
  genderBadgeRow: {
    marginBottom: 12,
  },
  name: {
    alignSelf: 'flex-start',
    fontSize: 56,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#2D1B4E',
    marginBottom: 12,
  },
  underline: {
    height: 6,
    borderRadius: 3,
    marginBottom: 12,
  },
  originRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  originPill: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  speakButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  originText: {
    fontSize: 17,
    fontFamily: Fonts?.sans,
    color: '#2D1B4E',
    fontWeight: '600',
  },
  meaningBox: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    flexShrink: 1,
    minHeight: 0,
  },
  meaningText: {
    fontSize: 17,
    lineHeight: 26,
    color: '#2D1B4E',
    fontFamily: Fonts?.sans,
  },
  swipeHint: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  popularityRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 'auto',
  },
  statTile: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  sparklineTile: {
    flex: 2,
    borderRadius: 10,
    padding: 10,
    paddingHorizontal: 12,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A89BB5',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  statValueRank: {
    fontSize: 17,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#2D1B4E',
  },
  statValueMuted: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#A89BB5',
  },
  statValueTrend: {
    fontSize: 14,
    fontWeight: '700',
  },
  statValuePeak: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D1B4E',
  },
  sparklineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  sparklineChart: {
    flex: 1,
    height: 28,
  },
  trendArrow: {
    fontSize: 16,
    fontWeight: '700',
  },
  noTrendText: {
    fontSize: 10,
    fontFamily: Fonts?.sans,
    color: '#A89BB5',
    marginTop: 2,
  },
  swipeHintInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  swipeHintText: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#A89BB5',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
});
