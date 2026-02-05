import { forwardRef, useImperativeHandle, useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import * as Speech from 'expo-speech';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  interpolateColor,
  withTiming,
  Extrapolation,
} from 'react-native-reanimated';
import { GestureDetector, TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Doc } from '@/convex/_generated/dataModel';
import { useCardAnimation } from '@/hooks/use-card-animation';
import { useSwipeGesture } from '@/hooks/use-swipe-gesture';
import { useVoiceSettings } from '@/contexts/voice-settings-context';
import { CARD_WIDTH, CARD_HEIGHT_FULL, SWIPE_THRESHOLD, SWIPE_COLORS } from '@/constants/swipe';
import { Fonts } from '@/constants/theme';

export interface SwipeCardRef {
  swipeLeft: () => void;
  swipeRight: () => void;
}

interface SwipeCardProps {
  name: Doc<'names'>;
  isTop: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeComplete?: (direction: 'left' | 'right') => void;
}

// Gender-based underline colors
const UNDERLINE_COLORS = {
  male: '#60a5fa', // blue
  female: '#f472b6', // pink
  neutral: '#a78bfa', // lilac/purple
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
  { name, isTop, onSwipeLeft, onSwipeRight, onSwipeComplete },
  ref,
) {
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
  const likeOverlayStyle = useAnimatedStyle(() => {
    const progress = translateX.value / SWIPE_THRESHOLD;
    return {
      opacity: interpolate(progress, [0, 1], [0, 1], Extrapolation.CLAMP),
    };
  });

  // Dislike overlay - only shows when swiping LEFT (negative translateX)
  const dislikeOverlayStyle = useAnimatedStyle(() => {
    const progress = -translateX.value / SWIPE_THRESHOLD;
    return {
      opacity: interpolate(progress, [0, 1], [0, 1], Extrapolation.CLAMP),
    };
  });

  // Animated border that fades out during swipe
  const cardBorderStyle = useAnimatedStyle(() => {
    const progress = Math.abs(translateX.value) / SWIPE_THRESHOLD;
    return {
      borderWidth: interpolate(progress, [0, 0.5], [5, 0], Extrapolation.CLAMP),
      borderColor: interpolateColor(progress, [0, 0.5], ['#1a1a1a', 'transparent']),
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

  useEffect(() => {
    if (isTop && nameWidth > 0 && !hasAnimated.current) {
      hasAnimated.current = true;
      underlineWidth.value = 0;
      underlineWidth.value = withTiming(nameWidth, { duration: 400 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTop, nameWidth]);

  const underlineAnimatedStyle = useAnimatedStyle(() => ({
    width: underlineWidth.value,
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
      console.error('Speech error:', error);
      setIsSpeaking(false);
    }
  }, [name.name, getBestVoice]);

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.card,
          isTop && cardAnimatedStyle,
          isTop && cardBorderStyle,
          { zIndex: isTop ? 2 : 1 },
        ]}
      >
        {/* LIKE overlay - shows when swiping right */}
        <Animated.View
          style={[styles.overlay, styles.likeOverlay, likeOverlayStyle]}
          pointerEvents="none"
        >
          <View style={styles.likeStamp}>
            <Ionicons name="heart" size={24} color="#22c55e" />
            <Text style={styles.likeStampText}>LIKE</Text>
          </View>
        </Animated.View>

        {/* DISLIKE overlay - shows when swiping left */}
        <Animated.View
          style={[styles.overlay, styles.dislikeOverlay, dislikeOverlayStyle]}
          pointerEvents="none"
        >
          <View style={styles.dislikeStamp}>
            <Ionicons name="heart-dislike" size={24} color="#ef4444" />
            <Text style={styles.dislikeStampText}>NOPE</Text>
          </View>
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
          <View style={styles.originRow}>
            {name.origin && (
              <View style={styles.originPill}>
                <Text style={styles.originText}>
                  {ORIGIN_FLAGS[name.origin] || '🌍'} {name.origin}
                </Text>
              </View>
            )}
            <TouchableOpacity
              onPress={handleReadName}
              style={styles.speakButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
              accessibilityLabel={`Read ${name.name} aloud`}
            >
              <Ionicons
                name={isSpeaking ? 'volume-high' : 'volume-medium'}
                size={24}
                color={isSpeaking ? '#0a7ea4' : '#6b7280'}
              />
            </TouchableOpacity>
          </View>

          {/* Meaning box */}
          {name.meaning && (
            <View style={styles.meaningBox}>
              <Text style={styles.meaningText}>{name.meaning}</Text>
            </View>
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
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 5,
    borderColor: '#1a1a1a',
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
    borderColor: '#22c55e',
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
    borderColor: '#ef4444',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  likeStampText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#22c55e',
    letterSpacing: 3,
  },
  dislikeStampText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ef4444',
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
    color: '#1a1a1a',
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
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  speakButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  originText: {
    fontSize: 17,
    fontFamily: Fonts?.sans,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  meaningBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  meaningText: {
    fontSize: 17,
    lineHeight: 26,
    color: '#374151',
    fontFamily: Fonts?.sans,
  },
});
