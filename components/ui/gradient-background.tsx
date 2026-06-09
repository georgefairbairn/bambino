import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme, type ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '@/contexts/theme-context';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

interface GradientBackgroundProps {
  variant?: 'screen' | 'auth';
  style?: ViewStyle;
  children: React.ReactNode;
  /**
   * Fade the gradient in on mount. Defaults to true. Set false where the
   * background is shown repeatedly across remounts (e.g. the LoadingScreen,
   * which mounts at several sequential loading gates) — re-fading the
   * background on each new instance reads as a flash/restart.
   */
  animateEntrance?: boolean;
}

export function GradientBackground({
  variant = 'screen',
  style,
  children,
  animateEntrance = true,
}: GradientBackgroundProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { gradients } = useTheme();

  const colors =
    variant === 'auth' ? gradients.authBg : isDark ? gradients.screenBgDark : gradients.screenBg;

  return (
    <AnimatedGradient
      entering={animateEntrance ? FadeIn.duration(250) : undefined}
      colors={[...colors]}
      style={[{ flex: 1 }, style]}
    >
      {children}
    </AnimatedGradient>
  );
}
