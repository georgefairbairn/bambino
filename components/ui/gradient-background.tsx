import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme, type ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '@/contexts/theme-context';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

interface GradientBackgroundProps {
  variant?: 'screen' | 'auth';
  style?: ViewStyle;
  children: React.ReactNode;
}

export function GradientBackground({
  variant = 'screen',
  style,
  children,
}: GradientBackgroundProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { gradients } = useTheme();

  const colors =
    variant === 'auth' ? gradients.authBg : isDark ? gradients.screenBgDark : gradients.screenBg;

  return (
    <AnimatedGradient
      entering={FadeIn.duration(250)}
      colors={[...colors]}
      style={[{ flex: 1 }, style]}
    >
      {children}
    </AnimatedGradient>
  );
}
