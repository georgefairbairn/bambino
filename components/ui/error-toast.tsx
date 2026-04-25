import { useCallback, useEffect, useRef } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

const TOAST_HEIGHT = 56;

interface ErrorToastProps {
  visible: boolean;
  message: string;
  onDismiss: () => void;
}

export function ErrorToast({ visible, message, onDismiss }: ErrorToastProps) {
  const translateY = useSharedValue(-(TOAST_HEIGHT + 20));
  const opacity = useSharedValue(0);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const animateOut = useCallback(() => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }

    opacity.value = withTiming(0, { duration: 200 });
    translateY.value = withTiming(
      -(TOAST_HEIGHT + 20),
      {
        duration: 300,
        easing: Easing.in(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(onDismissRef.current)();
        }
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      translateY.value = withTiming(0, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      });
      opacity.value = withTiming(1, { duration: 300 });

      dismissTimer.current = setTimeout(() => {
        animateOut();
      }, 3000);
    } else {
      translateY.value = -(TOAST_HEIGHT + 20);
      opacity.value = 0;
    }

    return () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
        dismissTimer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, animateOut]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Animated.View style={styles.toast}>
        <Ionicons name="alert-circle" size={20} color="#FF5C8A" />
        <Text style={styles.message}>{message}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: -36,
    left: 6,
    right: 6,
    zIndex: 10,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#FF5C8A',
    backgroundColor: '#FFF0F3',
    paddingVertical: 12,
    paddingHorizontal: 18,
    shadowColor: '#FF5C8A',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  message: {
    flex: 1,
    fontFamily: Fonts?.sans,
    fontSize: 14,
    fontWeight: '600',
    color: '#2D1B4E',
  },
});
