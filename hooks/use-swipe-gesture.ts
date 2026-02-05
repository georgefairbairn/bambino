import { useCallback } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, SharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SWIPE_THRESHOLD, SWIPE_VELOCITY } from '@/constants/swipe';

interface UseSwipeGestureOptions {
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  updatePosition: (x: number, y: number) => void;
  resetPosition: () => void;
  swipeLeft: () => void;
  swipeRight: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  enabled?: boolean;
}

export function useSwipeGesture({
  translateX,
  translateY,
  updatePosition,
  resetPosition,
  swipeLeft,
  swipeRight,
  onSwipeLeft,
  onSwipeRight,
  enabled = true,
}: UseSwipeGestureOptions) {
  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleSwipeLeft = useCallback(() => {
    triggerHaptic();
    onSwipeLeft?.();
  }, [triggerHaptic, onSwipeLeft]);

  const handleSwipeRight = useCallback(() => {
    triggerHaptic();
    onSwipeRight?.();
  }, [triggerHaptic, onSwipeRight]);

  const panGesture = Gesture.Pan()
    .enabled(enabled)
    .onUpdate((event) => {
      'worklet';
      updatePosition(event.translationX, event.translationY);
    })
    .onEnd((event) => {
      'worklet';
      const { translationX, velocityX } = event;

      // Check if swipe passes threshold by position or velocity
      const shouldSwipeRight = translationX > SWIPE_THRESHOLD || velocityX > SWIPE_VELOCITY;
      const shouldSwipeLeft = translationX < -SWIPE_THRESHOLD || velocityX < -SWIPE_VELOCITY;

      if (shouldSwipeRight) {
        swipeRight();
        runOnJS(handleSwipeRight)();
      } else if (shouldSwipeLeft) {
        swipeLeft();
        runOnJS(handleSwipeLeft)();
      } else {
        // Didn't pass threshold, spring back to center
        resetPosition();
      }
    });

  return {
    panGesture,
  };
}
