import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { BubblePillsBackground } from '@/components/ui/bubble-pills-background';

interface EmptyStateProps {
  onReviewSkipped?: () => void;
  hasSkippedNames?: boolean;
}

export function EmptyState({ onReviewSkipped, hasSkippedNames = false }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <BubblePillsBackground />

      <Animated.Text entering={FadeInUp.delay(200).duration(400).springify()} style={styles.title}>
        You&apos;ve Reviewed All Names!
      </Animated.Text>

      <Animated.Text entering={FadeInUp.delay(300).duration(400)} style={styles.description}>
        Amazing work! Check your liked names or adjust filters to discover more.
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
    justifyContent: 'flex-start',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  title: {
    fontSize: 24,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
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
