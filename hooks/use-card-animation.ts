import { useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  runOnUI,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { MAX_ROTATION, EXIT_X, EXIT_Y, SPRING_CONFIG, TIMING_CONFIG } from '@/constants/swipe';

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
        [MAX_ROTATION, 0, -MAX_ROTATION],
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
    translateY.value = withTiming(EXIT_Y, TIMING_CONFIG);
    rotation.value = withTiming(MAX_ROTATION, TIMING_CONFIG);
  }, [translateX, translateY, rotation, onSwipeComplete]);

  // Animate card exit to the right
  const swipeRight = useCallback(() => {
    'worklet';
    translateX.value = withTiming(EXIT_X, TIMING_CONFIG, (finished) => {
      if (finished && onSwipeComplete) {
        runOnJS(onSwipeComplete)('right');
      }
    });
    translateY.value = withTiming(EXIT_Y, TIMING_CONFIG);
    rotation.value = withTiming(-MAX_ROTATION, TIMING_CONFIG);
  }, [translateX, translateY, rotation, onSwipeComplete]);

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
      { translateY: translateY.value * -0.3 }, // dampen vertical, bias upward
      { rotate: `${rotation.value}deg` },
    ],
  }));

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
    cardAnimatedStyle,
  };
}
