import { ActivityIndicator, Pressable, Text, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

interface SwipeActionButtonsProps {
  onLike: () => void;
  onNope: () => void;
  disabled?: boolean;
  /** When true, skip the FadeInUp entrance — respects user's Reduce Motion setting. */
  reduceMotion?: boolean;
}

export function SwipeActionButtons({
  onLike,
  onNope,
  disabled = false,
  reduceMotion = false,
}: SwipeActionButtonsProps) {
  const { colors, gradients } = useTheme();

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInUp.delay(200).duration(400).springify()}
      style={styles.container}
    >
      <Pressable
        onPress={onNope}
        disabled={disabled}
        accessibilityLabel="Pass"
        accessibilityRole="button"
        style={[styles.button, disabled && styles.disabled]}
      >
        <View style={[styles.secondaryButton, { borderColor: colors.primary }]}>
          <Text style={[styles.secondaryText, { color: colors.primary }]}>Pass</Text>
        </View>
      </Pressable>

      <Pressable
        onPress={onLike}
        disabled={disabled}
        accessibilityLabel="Like"
        accessibilityRole="button"
        style={[styles.button, disabled && styles.disabled]}
      >
        <LinearGradient
          colors={[...gradients.buttonPrimary]}
          style={[styles.gradient, { shadowColor: colors.primary }]}
        >
          {disabled ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.gradientText}>Like</Text>
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

// Approximate height the row takes when rendered. Used by callers to
// reserve vertical space (e.g. shrink the card so this fits below).
export const SWIPE_ACTION_BUTTONS_HEIGHT = 80;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  button: {
    flex: 1,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  gradientText: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
  },
  secondaryText: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.6,
  },
});
