import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

interface EmptyStateProps {
  onReviewSkipped?: () => void;
  hasSkippedNames?: boolean;
}

export function EmptyState({ onReviewSkipped, hasSkippedNames = false }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <Animated.View entering={ZoomIn.duration(400).springify()} style={styles.iconContainer}>
        <Ionicons name="checkmark-circle" size={80} color="#6DD5A0" />
      </Animated.View>

      <Animated.Text entering={FadeInUp.delay(200).duration(400).springify()} style={styles.title}>
        You&apos;ve reviewed all names!
      </Animated.Text>

      <Animated.Text entering={FadeInUp.delay(300).duration(400)} style={styles.description}>
        Check your liked names or adjust filters to see more.
      </Animated.Text>

      {hasSkippedNames && onReviewSkipped && (
        <Animated.View
          entering={FadeInUp.delay(400).duration(400).springify()}
          style={styles.actions}
        >
          <Pressable
            onPress={onReviewSkipped}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.primary },
              pressed && styles.buttonPressed,
            ]}
          >
            <Ionicons name="refresh" size={20} color="#ffffff" />
            <Text style={styles.primaryButtonText}>Review Skipped Names</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#2D1B4E',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  actions: {
    gap: 12,
    width: '100%',
    maxWidth: 280,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
