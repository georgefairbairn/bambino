import { TextInput, StyleSheet, type TextInputProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Fonts, CandyColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

interface StyledInputProps extends TextInputProps {
  error?: boolean;
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export function StyledInput({ error, style, onFocus, onBlur, ...props }: StyledInputProps) {
  const focused = useSharedValue(0);
  const { colors } = useTheme();

  const animatedStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      focused.value,
      [0, 1, 2],
      [colors.border, colors.primary, CandyColors.danger],
    );

    return {
      borderColor,
      shadowColor: focused.value === 1 ? colors.primary : 'transparent',
      shadowOpacity: focused.value === 1 ? 0.15 : 0,
      shadowRadius: focused.value === 1 ? 8 : 0,
      shadowOffset: { width: 0, height: 0 },
      elevation: focused.value === 1 ? 2 : 0,
    };
  });

  return (
    <AnimatedTextInput
      style={[styles.input, { backgroundColor: colors.surfaceSubtle }, animatedStyle, style]}
      placeholderTextColor={CandyColors.textMuted}
      onFocus={(e) => {
        focused.value = withTiming(error ? 2 : 1, { duration: 200 });
        onFocus?.(e);
      }}
      onBlur={(e) => {
        focused.value = withTiming(error ? 2 : 0, { duration: 200 });
        onBlur?.(e);
      }}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: Fonts?.sans,
    color: CandyColors.textPrimary,
  },
});
