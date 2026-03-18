import { useEffect } from 'react';
import { Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

interface LoadingIndicatorProps {
  size?: 'small' | 'large';
}

export function LoadingIndicator({ size = 'large' }: LoadingIndicatorProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const { colors } = useTheme();

  useEffect(() => {
    const timingConfig = { duration: 800, easing: Easing.inOut(Easing.ease) };

    scale.value = withRepeat(
      withSequence(withTiming(0.95, timingConfig), withTiming(1.05, timingConfig)),
      -1,
      true,
    );

    opacity.value = withRepeat(
      withSequence(withTiming(0.5, timingConfig), withTiming(1.0, timingConfig)),
      -1,
      true,
    );
  }, [scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const fontSize = size === 'small' ? 16 : 28;

  return (
    <Animated.View style={animatedStyle}>
      <Text
        style={{
          fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
          fontSize,
          color: colors.primary,
        }}
      >
        bambino
      </Text>
    </Animated.View>
  );
}
