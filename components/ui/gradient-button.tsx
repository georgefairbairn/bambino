import { Pressable, Text, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Fonts, Gradients as DefaultGradients } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { LoadingIndicator } from './loading-indicator';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GradientButton({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
}: GradientButtonProps) {
  const scale = useSharedValue(1);
  const { colors, gradients } = useTheme();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  if (variant === 'secondary') {
    return (
      <AnimatedPressable
        style={[
          animatedStyle,
          styles.secondaryButton,
          { borderColor: colors.primary },
          disabled && styles.disabled,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
      >
        {loading ? (
          <LoadingIndicator size="small" />
        ) : (
          <View style={styles.contentRow}>
            {icon && <Ionicons name={icon} size={20} color={colors.primary} />}
            <Text style={[styles.secondaryText, { color: colors.primary }]}>{title}</Text>
          </View>
        )}
      </AnimatedPressable>
    );
  }

  const gradientColors =
    variant === 'danger' ? DefaultGradients.buttonDanger : gradients.buttonPrimary;

  const shadowColor = variant === 'danger' ? '#FF6B6B' : colors.primary;

  return (
    <AnimatedPressable
      style={[animatedStyle, disabled && styles.disabled]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
    >
      <LinearGradient colors={[...gradientColors]} style={[styles.gradient, { shadowColor }]}>
        {loading ? (
          <LoadingIndicator size="small" />
        ) : (
          <View style={styles.contentRow}>
            {icon && <Ionicons name={icon} size={20} color="#fff" />}
            <Text style={styles.gradientText}>{title}</Text>
          </View>
        )}
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  gradient: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
  },
  secondaryText: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  disabled: {
    opacity: 0.6,
  },
});
