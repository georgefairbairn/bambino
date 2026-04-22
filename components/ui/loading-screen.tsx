import { useEffect, useCallback, useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { GradientBackground } from './gradient-background';

const LETTERS = ['b', 'a', 'm', 'b', 'i', 'n', 'o'];
const STAGGER = 120;
const BOUNCE_UP = 280;
const BOUNCE_DOWN = 280;
const B_BOUNCE_UP = 450;
const B_BOUNCE_DOWN = 450;
const BOUNCE_HEIGHT = -18;
const CYCLE_GAP = 500;
const FADE_OUT = 400;

// Calculate cycle duration so all letters loop in sync
const letterEndTimes = LETTERS.map((_, i) => {
  const isFirstB = i === 0;
  const stagger = i * STAGGER;
  const bounce = isFirstB ? B_BOUNCE_UP + B_BOUNCE_DOWN : BOUNCE_UP + BOUNCE_DOWN;
  return stagger + bounce;
});
const CYCLE_ACTIVE = Math.max(...letterEndTimes);
const CYCLE_DURATION = CYCLE_ACTIVE + CYCLE_GAP;

function AnimatedLetter({
  letter,
  index,
  isFirstB,
  color,
}: {
  letter: string;
  index: number;
  isFirstB: boolean;
  color: string;
}) {
  const translateY = useSharedValue(0);
  const rotateY = useSharedValue(0);

  useEffect(() => {
    const stagger = index * STAGGER;
    const upDur = isFirstB ? B_BOUNCE_UP : BOUNCE_UP;
    const downDur = isFirstB ? B_BOUNCE_DOWN : BOUNCE_DOWN;
    const waitAfter = CYCLE_DURATION - stagger - upDur - downDur;

    // Each letter: wait(stagger) -> bounce up -> bounce down -> wait(remaining)
    // Total duration per letter = CYCLE_DURATION, keeping everything in sync
    translateY.value = withRepeat(
      withSequence(
        withTiming(0, { duration: stagger }),
        withTiming(BOUNCE_HEIGHT, {
          duration: upDur,
          easing: Easing.out(Easing.cubic),
        }),
        withTiming(0, {
          duration: downDur,
          easing: Easing.bounce,
        }),
        withTiming(0, { duration: waitAfter }),
      ),
      -1,
    );

    if (isFirstB) {
      const spinDur = B_BOUNCE_UP + B_BOUNCE_DOWN;
      const spinWaitAfter = CYCLE_DURATION - spinDur;

      rotateY.value = withRepeat(
        withSequence(
          withTiming(360, {
            duration: spinDur,
            easing: Easing.inOut(Easing.cubic),
          }),
          withTiming(360, { duration: spinWaitAfter }),
          // Near-instant reset (visually identical: 360deg = 0deg)
          withTiming(0, { duration: 1 }),
        ),
        -1,
      );
    }
  }, [index, isFirstB, translateY, rotateY]);

  const animatedStyle = useAnimatedStyle(() => {
    if (isFirstB) {
      return {
        transform: [
          { perspective: 800 },
          { translateY: translateY.value },
          { rotateY: `${rotateY.value}deg` },
        ],
      };
    }
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  return <Animated.Text style={[styles.letter, { color }, animatedStyle]}>{letter}</Animated.Text>;
}

interface LoadingScreenProps {
  /** When false, the animation completes one more cycle then fades out. */
  isLoading?: boolean;
  /** Called after the fade-out animation finishes. */
  onFinished?: () => void;
}

const TIMEOUT_MS = 15000;

export function LoadingScreen({ isLoading = true, onFinished }: LoadingScreenProps) {
  const { colors } = useTheme();
  const containerOpacity = useSharedValue(1);
  const [timedOut, setTimedOut] = useState(false);

  const handleFinished = useCallback(() => {
    onFinished?.();
  }, [onFinished]);

  useEffect(() => {
    if (!isLoading) {
      // Wait one full cycle so the current animation completes, then fade out
      const timeout = setTimeout(() => {
        containerOpacity.value = withTiming(
          0,
          { duration: FADE_OUT, easing: Easing.out(Easing.ease) },
          (finished) => {
            if (finished) {
              runOnJS(handleFinished)();
            }
          },
        );
      }, CYCLE_DURATION);
      return () => clearTimeout(timeout);
    }
  }, [isLoading, containerOpacity, handleFinished]);

  useEffect(() => {
    if (!isLoading) return;
    const timeout = setTimeout(() => setTimedOut(true), TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <GradientBackground>
      <Animated.View style={[styles.container, containerStyle]}>
        <View style={styles.letterRow}>
          {LETTERS.map((letter, index) => (
            <AnimatedLetter
              key={index}
              letter={letter}
              index={index}
              isFirstB={index === 0}
              color={colors.primary}
            />
          ))}
        </View>
        {timedOut && (
          <View style={styles.timeoutContainer}>
            <Text style={styles.timeoutText}>Taking longer than expected...</Text>
            <Pressable
              onPress={() => {
                setTimedOut(false);
              }}
            >
              <Text style={[styles.timeoutRetry, { color: colors.primary }]}>Tap to dismiss</Text>
            </Pressable>
          </View>
        )}
      </Animated.View>
    </GradientBackground>
  );
}

/**
 * Hook for graceful loading-to-content transitions.
 * Keeps the LoadingScreen visible until the exit animation completes.
 * Skips the loading screen entirely if data loads within `graceMs` of mount.
 *
 * Usage:
 *   const data = useQuery(...);
 *   const { showLoading, loadingProps } = useGracefulLoading(data !== undefined);
 *   if (showLoading) return <LoadingScreen {...loadingProps} />;
 */
const DEFAULT_GRACE_MS = 500;

export function useGracefulLoading(isLoaded: boolean, graceMs = DEFAULT_GRACE_MS) {
  const [phase, setPhase] = useState<'grace' | 'loading' | 'exiting' | 'done'>(
    isLoaded ? 'done' : 'grace',
  );
  const wasLoadedOnMount = useRef(isLoaded);

  // Grace period: if data arrives quickly, skip the loading screen entirely
  useEffect(() => {
    if (phase !== 'grace') return;
    const timeout = setTimeout(() => setPhase('loading'), graceMs);
    return () => clearTimeout(timeout);
  }, [phase, graceMs]);

  useEffect(() => {
    if (isLoaded && (phase === 'grace' || phase === 'loading')) {
      setPhase(phase === 'grace' ? 'done' : 'exiting');
    }
  }, [isLoaded, phase]);

  const onFinished = useCallback(() => setPhase('done'), []);

  return {
    showLoading: phase === 'loading' || phase === 'exiting',
    loadingProps: {
      isLoading: phase === 'loading',
      onFinished,
    },
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  letter: {
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    fontSize: 36,
  },
  timeoutContainer: {
    position: 'absolute',
    bottom: 120,
    alignItems: 'center',
    gap: 8,
  },
  timeoutText: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
  },
  timeoutRetry: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
  },
});
