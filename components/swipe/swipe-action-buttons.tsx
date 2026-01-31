import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SWIPE_COLORS } from '@/constants/swipe';

interface SwipeActionButtonsProps {
  onLike: () => void;
  onNope: () => void;
  onSkip: () => void;
  disabled?: boolean;
}

export function SwipeActionButtons({
  onLike,
  onNope,
  onSkip,
  disabled = false,
}: SwipeActionButtonsProps) {
  return (
    <View style={styles.container}>
      {/* Nope button */}
      <Pressable
        onPress={onNope}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          styles.nopeButton,
          pressed && styles.buttonPressed,
          disabled && styles.buttonDisabled,
        ]}
      >
        <Ionicons name="close" size={32} color={disabled ? '#d1d5db' : SWIPE_COLORS.nope} />
      </Pressable>

      {/* Skip button */}
      <Pressable
        onPress={onSkip}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          styles.skipButton,
          pressed && styles.buttonPressed,
          disabled && styles.buttonDisabled,
        ]}
      >
        <Ionicons name="help" size={24} color={disabled ? '#d1d5db' : SWIPE_COLORS.skip} />
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
        <Ionicons name="heart" size={32} color={disabled ? '#d1d5db' : SWIPE_COLORS.like} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    marginTop: 32,
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  nopeButton: {
    borderColor: SWIPE_COLORS.nope,
  },
  skipButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderColor: SWIPE_COLORS.skip,
  },
  likeButton: {
    borderColor: SWIPE_COLORS.like,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  buttonDisabled: {
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
});
