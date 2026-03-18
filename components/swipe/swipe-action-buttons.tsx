import { Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/theme-context';

interface SwipeActionButtonsProps {
  onLike: () => void;
  onNope: () => void;
  disabled?: boolean;
}

export function SwipeActionButtons({ onLike, onNope, disabled = false }: SwipeActionButtonsProps) {
  const { colors } = useTheme();
  return (
    <Animated.View
      entering={FadeInUp.delay(200).duration(400).springify()}
      style={styles.container}
    >
      {/* Dislike button */}
      <Pressable
        onPress={onNope}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          { shadowColor: colors.secondary },
          styles.dislikeButton,
          pressed && styles.buttonPressed,
          disabled && { borderColor: colors.border, backgroundColor: colors.surfaceSubtle },
        ]}
      >
        <Ionicons name="heart-dislike" size={32} color={disabled ? '#FFD4E0' : '#FF8FAB'} />
      </Pressable>

      {/* Like button */}
      <Pressable
        onPress={onLike}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          { shadowColor: colors.secondary },
          styles.likeButton,
          pressed && styles.buttonPressed,
          disabled && { borderColor: colors.border, backgroundColor: colors.surfaceSubtle },
        ]}
      >
        <Ionicons name="heart" size={32} color={disabled ? '#B4EAD0' : '#6DD5A0'} />
      </Pressable>
    </Animated.View>
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
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  dislikeButton: {
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#FF8FAB',
  },
  likeButton: {
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#6DD5A0',
  },
  buttonPressed: {
    transform: [{ scale: 0.92 }],
  },
});
