import { useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  runOnUI,
  interpolate,
  interpolateColor,
  Extrapolation,
} from 'react-native-reanimated';
import {
  SWIPE_THRESHOLD,
  MAX_ROTATION,
  ROTATION_FACTOR,
  EXIT_X,
  SPRING_CONFIG,
  TIMING_CONFIG,
  SWIPE_COLORS,
  CARD_STYLES,
} from '@/constants/swipe';

export type SwipeDirection = 'left' | 'right';

interface UseCardAnimationOptions {
  onSwipeComplete?: (direction: SwipeDirection) => void;
}

export function useCardAnimation(options: UseCardAnimationOptions = {}) {
  const { onSwipeComplete } = options;

  // Shared values for card position
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Derived rotation from X position
  const rotation = useSharedValue(0);

  // Update position during drag
  const updatePosition = useCallback(
    (x: number, y: number) => {
      'worklet';
      translateX.value = x;
      translateY.value = y;
      rotation.value = interpolate(
        x,
        [-200, 0, 200],
        [-MAX_ROTATION, 0, MAX_ROTATION],
        Extrapolation.CLAMP,
      );
    },
    [translateX, translateY, rotation],
  );

  // Reset card to center position
  const resetPosition = useCallback(() => {
    'worklet';
    translateX.value = withSpring(0, SPRING_CONFIG);
    translateY.value = withSpring(0, SPRING_CONFIG);
    rotation.value = withSpring(0, SPRING_CONFIG);
  }, [translateX, translateY, rotation]);

  // Animate card exit to the left
  const swipeLeft = useCallback(() => {
    'worklet';
    translateX.value = withTiming(-EXIT_X, TIMING_CONFIG, (finished) => {
      if (finished && onSwipeComplete) {
        runOnJS(onSwipeComplete)('left');
      }
    });
    rotation.value = withTiming(-MAX_ROTATION, TIMING_CONFIG);
  }, [translateX, rotation, onSwipeComplete]);

  // Animate card exit to the right
  const swipeRight = useCallback(() => {
    'worklet';
    translateX.value = withTiming(EXIT_X, TIMING_CONFIG, (finished) => {
      if (finished && onSwipeComplete) {
        runOnJS(onSwipeComplete)('right');
      }
    });
    rotation.value = withTiming(MAX_ROTATION, TIMING_CONFIG);
  }, [translateX, rotation, onSwipeComplete]);

  // JS-callable wrappers for programmatic swipes (from button presses)
  const swipeLeftFromJS = useCallback(() => {
    runOnUI(swipeLeft)();
  }, [swipeLeft]);

  const swipeRightFromJS = useCallback(() => {
    runOnUI(swipeRight)();
  }, [swipeRight]);

  // Animated style for the card transform
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value * 0.3 }, // dampen vertical movement
      { rotate: `${rotation.value}deg` },
    ],
  }));

  // Animated opacity for "LIKE" overlay (visible when swiping right)
  const likeOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  // Animated opacity for "NOPE" overlay (visible when swiping left)
  const nopeOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP),
  }));

  // Animated background color - transitions from cream to green/red based on swipe direction
  const cardBackgroundStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      translateX.value,
      [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
      [SWIPE_COLORS.nope, CARD_STYLES.backgroundColor, SWIPE_COLORS.like],
    ),
  }));

  // Animated text color - transitions from dark to white as swipe progresses
  const textColorStyle = useAnimatedStyle(() => {
    const progress = Math.abs(translateX.value) / SWIPE_THRESHOLD;
    return {
      color: interpolateColor(
        Math.min(progress, 1),
        [0, 1],
        ['#1a1a1a', '#ffffff'],
      ),
    };
  });

  // Reset all values immediately (for when card is removed from deck)
  const resetImmediate = useCallback(() => {
    translateX.value = 0;
    translateY.value = 0;
    rotation.value = 0;
  }, [translateX, translateY, rotation]);

  return {
    translateX,
    translateY,
    rotation,
    updatePosition,
    resetPosition,
    swipeLeft,
    swipeRight,
    swipeLeftFromJS,
    swipeRightFromJS,
    resetImmediate,
    cardAnimatedStyle,
    likeOverlayStyle,
    nopeOverlayStyle,
    cardBackgroundStyle,
    textColorStyle,
  };
}
