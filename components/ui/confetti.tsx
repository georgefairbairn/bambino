import { useEffect, useMemo } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/contexts/theme-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PIECE_COUNT = 20;

interface ConfettiPiece {
  x: number;
  width: number;
  height: number;
  color: string;
  delay: number;
  duration: number;
  rotation: number;
  swayAmount: number;
}

function generatePieces(themeColors: string[]): ConfettiPiece[] {
  return Array.from({ length: PIECE_COUNT }, () => ({
    x: Math.random() * SCREEN_WIDTH,
    width: 6 + Math.random() * 4,
    height: 8 + Math.random() * 6,
    color: themeColors[Math.floor(Math.random() * themeColors.length)],
    delay: Math.random() * 600,
    duration: 2500 + Math.random() * 1000,
    rotation: Math.random() * 720,
    swayAmount: 20 + Math.random() * 40,
  }));
}

function ConfettiPieceView({ piece, trigger }: { piece: ConfettiPiece; trigger: boolean }) {
  const translateY = useSharedValue(-20);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (trigger) {
      translateY.value = -20;
      opacity.value = 0;

      opacity.value = withDelay(
        piece.delay,
        withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) }),
      );
      translateY.value = withDelay(
        piece.delay,
        withTiming(SCREEN_HEIGHT + 40, {
          duration: piece.duration,
          easing: Easing.in(Easing.quad),
        }),
      );

      // Fade out near end
      const fadeDelay = piece.delay + piece.duration * 0.75;
      opacity.value = withDelay(
        fadeDelay,
        withTiming(0, { duration: piece.duration * 0.25, easing: Easing.in(Easing.ease) }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { rotate: `${piece.rotation}deg` }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: piece.x,
          top: -20,
          width: piece.width,
          height: piece.height,
          backgroundColor: piece.color,
          borderRadius: piece.width > 8 ? piece.width / 2 : 1,
        },
        animatedStyle,
      ]}
    />
  );
}

interface ConfettiProps {
  visible: boolean;
}

export function Confetti({ visible }: ConfettiProps) {
  const { colors } = useTheme();

  const confettiColors = useMemo(
    () => [colors.primary, colors.secondary, '#FBBF24', '#34D399', '#60A5FA'],
    [colors.primary, colors.secondary],
  );

  const pieces = useMemo(() => generatePieces(confettiColors), [confettiColors]);

  if (!visible) return null;

  return (
    <Animated.View style={styles.container} pointerEvents="none">
      {pieces.map((piece, i) => (
        <ConfettiPieceView key={i} piece={piece} trigger={visible} />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    pointerEvents: 'none',
  },
});
