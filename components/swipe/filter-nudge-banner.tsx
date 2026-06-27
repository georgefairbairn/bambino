import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

// Drop-down distance — mirrors MatchToast so the two banners share the same
// motion and resting position over the top of the card stack.
export const FILTER_NUDGE_BANNER_HEIGHT = 72;

interface FilterNudgeBannerProps {
  visible: boolean;
  onPress: () => void;
}

/**
 * One-time "Adjust your filters" nudge banner. Visually matches MatchToast (the
 * app's established top drop-down callout) but is fully controlled by `visible`
 * — the parent drops it in on the trigger swipe and removes it on the next
 * swipe, so there's no internal auto-dismiss timer. Kept mounted (translated
 * off-screen when hidden) so the exit animation plays smoothly.
 */
export function FilterNudgeBanner({ visible, onPress }: FilterNudgeBannerProps) {
  const { colors } = useTheme();
  const translateY = useSharedValue(-(FILTER_NUDGE_BANNER_HEIGHT + 20));
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      translateY.value = withTiming(-(FILTER_NUDGE_BANNER_HEIGHT + 20), {
        duration: 300,
        easing: Easing.in(Easing.cubic),
      });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.container, animatedStyle]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Pressable
        style={[
          styles.banner,
          {
            borderColor: colors.primary,
            backgroundColor: colors.secondaryLight,
            shadowColor: colors.primary,
          },
        ]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLiveRegion="polite"
        accessibilityLabel="Not feeling these? Tap to adjust your filters"
      >
        <Ionicons name="options-outline" size={20} color={colors.tabActive} />
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.tabActive }]}>Not feeling these?</Text>
          <Text style={styles.subtitle}>Tap to adjust your filters</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#A89BB5" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Matches MatchToast's container + toast styling so the two read as one family.
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
