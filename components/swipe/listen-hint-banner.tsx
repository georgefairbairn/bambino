import { useCallback, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

// Drop-down distance — mirrors MatchToast/FilterNudgeBanner so all three top
// callouts share the same motion and resting position over the card stack.
export const LISTEN_HINT_BANNER_HEIGHT = 72;

// Auto-dismiss window. Slightly longer than MatchToast's 3s since this is a
// two-line instruction the user actually needs to read.
const AUTO_DISMISS_MS = 4500;

interface ListenHintBannerProps {
  visible: boolean;
  onDismiss: () => void;
}

/**
 * One-time "Can't hear it?" hint, shown the first time a user taps the Listen
 * (pronounce) button. iOS silent mode mutes expo-speech and there's no reliable
 * API to detect or override it (see expo/expo#10827), so we educate once rather
 * than try to fix it. Visually matches MatchToast (the app's established top
 * drop-down callout); auto-dismisses after a few seconds or on tap. The parent
 * persists "seen" so it never returns.
 */
export function ListenHintBanner({ visible, onDismiss }: ListenHintBannerProps) {
  const { colors } = useTheme();
  const translateY = useSharedValue(-(LISTEN_HINT_BANNER_HEIGHT + 20));
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
      -(LISTEN_HINT_BANNER_HEIGHT + 20),
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
      translateY.value = withTiming(0, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      });
      opacity.value = withTiming(1, { duration: 300 });

      dismissTimer.current = setTimeout(() => {
        animateOut();
      }, AUTO_DISMISS_MS);
    } else {
      translateY.value = -(LISTEN_HINT_BANNER_HEIGHT + 20);
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
      <Pressable
        style={[
          styles.banner,
          {
            borderColor: colors.primary,
            backgroundColor: colors.secondaryLight,
            shadowColor: colors.primary,
          },
        ]}
        onPress={animateOut}
        accessibilityRole="button"
        accessibilityLiveRegion="polite"
        accessibilityLabel="Can't hear it? Turn off Silent Mode and turn up your volume. Tap to dismiss."
      >
        <Ionicons name="volume-mute-outline" size={20} color={colors.tabActive} />
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.tabActive }]}>{"Can't hear it?"}</Text>
          <Text style={styles.subtitle}>Turn off Silent Mode and turn up your volume.</Text>
        </View>
        <Ionicons name="close" size={18} color="#A89BB5" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Matches MatchToast's container + toast styling so the callouts read as one family.
  container: {
    position: 'absolute',
    top: -36,
    left: 6,
    right: 6,
    zIndex: 10,
  },
  banner: {
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
});
