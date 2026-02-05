import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SwipeActionButtonsProps {
  onLike: () => void;
  onNope: () => void;
  disabled?: boolean;
}

export function SwipeActionButtons({ onLike, onNope, disabled = false }: SwipeActionButtonsProps) {
  return (
    <View style={styles.container}>
      {/* Dislike button */}
      <Pressable
        onPress={onNope}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          styles.dislikeButton,
          pressed && styles.buttonPressed,
          disabled && styles.buttonDisabled,
        ]}
      >
        <Ionicons name="heart-dislike" size={32} color={disabled ? '#fca5a5' : '#ef4444'} />
      </Pressable>

      {/* Like button */}
      <Pressable
        onPress={onLike}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          styles.likeButton,
          pressed && styles.buttonPressed,
          disabled && styles.buttonDisabled,
        ]}
      >
        <Ionicons name="heart" size={32} color={disabled ? '#86efac' : '#22c55e'} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  button: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  dislikeButton: {
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#ef4444',
  },
  likeButton: {
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#22c55e',
  },
  buttonPressed: {
    transform: [{ scale: 0.92 }],
  },
  buttonDisabled: {
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
});
