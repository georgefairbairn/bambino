import { forwardRef, useImperativeHandle, useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
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
  Extrapolation,
  cancelAnimation,
} from 'react-native-reanimated';
import { GestureDetector, TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Doc } from '@/convex/_generated/dataModel';
import { useCardAnimation } from '@/hooks/use-card-animation';
import { useSwipeGesture } from '@/hooks/use-swipe-gesture';
import { useVoiceSettings } from '@/contexts/voice-settings-context';
import { CARD_WIDTH, CARD_HEIGHT_FULL, SWIPE_THRESHOLD, SWIPE_COLORS } from '@/constants/swipe';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
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
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeComplete?: (direction: 'left' | 'right') => void;
}

// Gender-based underline colors
const UNDERLINE_COLORS = {
  male: '#7CB9E8', // sky blue
  female: '#FF8FAB', // candy pink
  neutral: '#C4A7E7', // soft purple
};

// Origin to country flag emoji mapping
const ORIGIN_FLAGS: Record<string, string> = {
  Hebrew: '🇮🇱',
  English: '🇬🇧',
  Latin: '🇮🇹',
  Greek: '🇬🇷',
  Germanic: '🇩🇪',
  Irish: '🇮🇪',
  French: '🇫🇷',
  Welsh: '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  Scottish: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  Italian: '🇮🇹',
  Spanish: '🇪🇸',
  Scandinavian: '🇸🇪',
  Dutch: '🇳🇱',
  Aramaic: '🇸🇾',
  Arabic: '🇸🇦',
};

export const SwipeCard = forwardRef<SwipeCardRef, SwipeCardProps>(function SwipeCard(
  {
    name,
    isTop,
    showSwipeHint = true,
    onSwipeHintShown,
    onSwipeLeft,
    onSwipeRight,
    onSwipeComplete,
  },
  ref,
) {
  const { colors } = useTheme();
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
    enabled: isTop,
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

  // Card background color: white -> green (right) or white -> red (left)
  const cardBackgroundStyle = useAnimatedStyle(() => {
    const progress = translateX.value / SWIPE_THRESHOLD;
    const backgroundColor = interpolateColor(
      progress,
      [-1, 0, 1],
      [SWIPE_COLORS.nope, '#FFFFFF', SWIPE_COLORS.like],
    );
    return { backgroundColor };
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

  // Swipe hint animation — appears after 10s of idle on top card
  const hintOpacity = useSharedValue(0);
  const hintTranslateX = useSharedValue(0);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hintActivatedRef = useRef(false);

  useEffect(() => {
    if (!isTop || !showSwipeHint || hintActivatedRef.current) return;

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
  }, [isTop]);

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
          isTop && cardBackgroundStyle,
          { zIndex: isTop ? 2 : 1 },
        ]}
      >
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
          {/* Name */}
          <Text style={styles.name} onLayout={handleNameLayout}>
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
                  {ORIGIN_FLAGS[name.origin] || '🌍'} {name.origin}
                </Text>
              </View>
            )}
            <TouchableOpacity
              onPress={handleReadName}
              style={[styles.speakButton, { backgroundColor: colors.surfaceSubtle }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
              accessibilityLabel={`Read ${name.name} aloud`}
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
              <Text style={styles.meaningText}>{name.meaning}</Text>
            </Animated.View>
          )}

          {/* Swipe hint — appears after 10s idle, once per session */}
          {isTop && (
            <Animated.View style={[styles.swipeHint, hintContainerStyle]} pointerEvents="none">
              <Animated.View style={[styles.swipeHintInner, hintArrowStyle]}>
                <Ionicons name="chevron-back" size={18} color="#A89BB5" />
                <Text style={styles.swipeHintText}>swipe</Text>
                <Ionicons name="chevron-forward" size={18} color="#A89BB5" />
              </Animated.View>
            </Animated.View>
          )}
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
    backgroundColor: SWIPE_COLORS.like,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  dislikeOverlay: {
    backgroundColor: SWIPE_COLORS.nope,
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
  name: {
    alignSelf: 'flex-start',
    fontSize: 56,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
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
  },
  meaningText: {
    fontSize: 17,
    lineHeight: 26,
    color: '#2D1B4E',
    fontFamily: Fonts?.sans,
  },
  swipeHint: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
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
