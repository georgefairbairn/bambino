import { useEffect, useRef } from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import * as Haptics from 'expo-haptics';

export const MATCH_TOAST_HEIGHT = 72;

interface MatchToastProps {
  visible: boolean;
  name: string;
  onPress: () => void;
  onDismiss: () => void;
}

export function MatchToast({ visible, name, onPress, onDismiss }: MatchToastProps) {
  const { colors } = useTheme();
  const translateY = useSharedValue(-(MATCH_TOAST_HEIGHT + 20));
  const opacity = useSharedValue(0);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Animate in from top
      translateY.value = withTiming(0, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      });
      opacity.value = withTiming(1, { duration: 300 });

      // Auto-dismiss after 3s
      dismissTimer.current = setTimeout(() => {
        animateOut();
      }, 3000);
    } else {
      translateY.value = -(MATCH_TOAST_HEIGHT + 20);
      opacity.value = 0;
    }

    return () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
        dismissTimer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const animateOut = () => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }

    opacity.value = withTiming(0, { duration: 200 });
    translateY.value = withTiming(
      -(MATCH_TOAST_HEIGHT + 20),
      {
        duration: 300,
        easing: Easing.in(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(onDismiss)();
        }
      },
    );
  };

  const handlePress = () => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Pressable
        style={[
          styles.toast,
          {
            borderColor: colors.primary,
            backgroundColor: colors.secondaryLight,
            shadowColor: colors.primary,
          },
        ]}
        onPress={handlePress}
      >
        <Text style={styles.emoji}>{'\uD83C\uDF89'}</Text>
        <Animated.View style={styles.content}>
          <Text style={[styles.title, { color: colors.tabActive }]}>{"It's a Match!"}</Text>
          <Text style={styles.subtitle}>{name} is on your shortlist</Text>
        </Animated.View>
        <Text style={styles.chevron}>{'\u203A'}</Text>
      </Pressable>
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
    paddingVertical: 12,
    paddingHorizontal: 18,
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  emoji: {
    fontSize: 18,
    lineHeight: 22,
  },
  content: {
    flex: 1,
  },
  title: {
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    fontWeight: '800',
    fontSize: 16,
  },
  subtitle: {
    fontFamily: Fonts?.sans,
    fontSize: 12,
    color: '#6B5B7B',
    marginTop: 1,
  },
  chevron: {
    fontSize: 18,
    color: '#A89BB5',
  },
});
