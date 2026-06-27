import { useEffect } from 'react';
import { Text, StyleSheet, Pressable, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { useA11yPreferences } from '@/hooks/use-a11y-preferences';

interface ExploreHeaderProps {
  liked: number;
  activeFilterCount: number;
  nudgeVisible: boolean;
  onFilterPress: () => void;
}

export function ExploreHeader({
  liked,
  activeFilterCount,
  nudgeVisible,
  onFilterPress,
}: ExploreHeaderProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { reduceMotion } = useA11yPreferences();

  // Pulse the Filters pill while the discovery nudge is showing. Reduce Motion
  // users get no animation — just the static tooltip below.
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (nudgeVisible && !reduceMotion) {
      pulse.value = withRepeat(
        withSequence(withTiming(1.06, { duration: 600 }), withTiming(1, { duration: 600 })),
        -1,
        true,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 200 });
    }
    return () => cancelAnimation(pulse);
  }, [nudgeVisible, reduceMotion, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <View style={styles.wrapper}>
      <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.container}>
        <Animated.View style={pulseStyle}>
          <Pressable
            style={[styles.filterPill, { shadowColor: colors.secondary }]}
            onPress={onFilterPress}
            accessibilityLabel={`Filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ''}`}
            accessibilityRole="button"
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          >
            <Ionicons name="options-outline" size={16} color="#2D1B4E" />
            <Text style={styles.filterLabel}>Filters</Text>
            {activeFilterCount > 0 && (
              <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </Animated.View>

        <Pressable
          style={[styles.likedButton, { shadowColor: colors.secondary }]}
          onPress={() => router.push('/(tabs)/dashboard')}
          accessibilityLabel="Liked names"
          accessibilityRole="button"
          hitSlop={8}
        >
          <Text style={styles.likedText}>{liked}</Text>
          <Ionicons name="heart" size={16} color={colors.primary} />
        </Pressable>
      </Animated.View>

      {nudgeVisible && (
        <Animated.View
          entering={FadeIn.duration(250)}
          style={styles.tooltipAnchor}
          pointerEvents="box-none"
        >
          <Pressable
            style={styles.tooltip}
            onPress={onFilterPress}
            accessibilityRole="button"
            accessibilityLiveRegion="polite"
            accessibilityLabel="Not feeling these? Adjust your filters"
          >
            <Text style={styles.tooltipText}>Not feeling these? Adjust your filters</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 10,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  filterLabel: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#2D1B4E',
  },
  filterBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  likedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  likedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B5B7B',
  },
  tooltipAnchor: {
    position: 'absolute',
    top: 48,
    left: 16,
  },
  tooltip: {
    backgroundColor: '#2D1B4E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    maxWidth: 260,
    shadowColor: '#2D1B4E',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  tooltipText: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#fff',
  },
});
