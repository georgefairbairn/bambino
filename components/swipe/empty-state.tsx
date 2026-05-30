import { View, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Fonts } from '@/constants/theme';
import { BubblePillsBackground } from '@/components/ui/bubble-pills-background';
import { GradientButton } from '@/components/ui/gradient-button';

interface EmptyStateProps {
  onOpenFilters?: () => void;
}

export function EmptyState({ onOpenFilters }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <BubblePillsBackground />

      <Animated.Text entering={FadeInUp.delay(200).duration(400).springify()} style={styles.title}>
        You&apos;ve Reviewed All Names!
      </Animated.Text>

      <Animated.Text entering={FadeInUp.delay(300).duration(400)} style={styles.description}>
        Amazing work! Check your liked names or adjust filters to discover more.
      </Animated.Text>

      {onOpenFilters && (
        <Animated.View
          entering={FadeInUp.delay(400).duration(400).springify()}
          style={styles.actions}
        >
          <GradientButton title="Adjust Filters" onPress={onOpenFilters} variant="primary" />
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
});
