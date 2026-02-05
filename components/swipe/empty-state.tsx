import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';

interface EmptyStateProps {
  onReviewSkipped?: () => void;
  hasSkippedNames?: boolean;
}

export function EmptyState({ onReviewSkipped, hasSkippedNames = false }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="checkmark-circle" size={80} color="#22c55e" />
      </View>

      <Text style={styles.title}>You&apos;ve reviewed all names!</Text>

      <Text style={styles.description}>Check your liked names or adjust filters to see more.</Text>

      {hasSkippedNames && onReviewSkipped && (
        <View style={styles.actions}>
          <Pressable
            onPress={onReviewSkipped}
            style={({ pressed }) => [
              styles.button,
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Ionicons name="refresh" size={20} color="#ffffff" />
            <Text style={styles.primaryButtonText}>Review Skipped Names</Text>
          </Pressable>
        </View>
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
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    color: '#6b7280',
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
  primaryButton: {
    backgroundColor: '#0a7ea4',
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
