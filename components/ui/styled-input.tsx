import { TextInput, StyleSheet, View, Pressable, type TextInputProps, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { CandyColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

interface StyledInputProps extends TextInputProps {
  error?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onClear?: () => void;
  containerStyle?: ViewStyle;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export function StyledInput({
  error,
  icon,
  onClear,
  style,
  containerStyle,
  value,
  onFocus,
  onBlur,
  className,
  ...props
}: StyledInputProps) {
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

  const showClear = onClear && value && value.length > 0;

  return (
    <View className={className} style={containerStyle}>
      <AnimatedView style={[styles.container, animatedStyle, style]}>
        {icon && (
          <Ionicons name={icon} size={20} color={CandyColors.textMuted} style={styles.icon} />
        )}
        <TextInput
          style={[styles.input, icon && styles.inputWithIcon, showClear && styles.inputWithClear]}
          placeholderTextColor={CandyColors.textMuted}
          value={value}
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
        {showClear && (
          <Pressable
            onPress={onClear}
            style={styles.clearButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={20} color={CandyColors.textMuted} />
          </Pressable>
        )}
      </AnimatedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: CandyColors.textPrimary,
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  inputWithClear: {
    paddingRight: 0,
  },
  clearButton: {
    padding: 4,
  },
});
