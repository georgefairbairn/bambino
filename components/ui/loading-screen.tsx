import { useEffect, useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  runOnJS,
  makeMutable,
  type SharedValue,
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
const B_SPIN_DUR = B_BOUNCE_UP + B_BOUNCE_DOWN;

// Easing closures built ONCE at module scope. They're worklets (Reanimated's
// Easing.* are worklet-tagged), so they may be *called* inside the worklets
// below — but must never be reconstructed per-frame.
const easeOutCubic = Easing.out(Easing.cubic);
const easeBounce = Easing.bounce;
const easeInOutCubic = Easing.inOut(Easing.cubic);

// A single continuous clock shared by every LoadingScreen/AnimatedLetter
// instance for the app's lifetime. The loader mounts at several sequential
// gates (root AuthGate -> tabs layout -> swipe-card-stack); if each instance
// ran its own withRepeat the bounce would visibly reset to frame 0 at every
// hand-off. Deriving all letters from one ever-running clock means a remount
// continues the bounce in-phase instead of restarting.
//
// Stored on globalThis so Fast Refresh (which re-evaluates this module) reuses
// the same mutable rather than orphaning already-mounted letters on a stale one.
type LoadingClockGlobal = typeof globalThis & {
  __bambinoLoadingClock?: SharedValue<number>;
  __bambinoLoadingClockStarted?: boolean;
};
const clockGlobal = globalThis as LoadingClockGlobal;
const loadingClock: SharedValue<number> =
  clockGlobal.__bambinoLoadingClock ?? (clockGlobal.__bambinoLoadingClock = makeMutable(0));

// Started lazily on the first LoadingScreen mount (not at import time) so frame
// 0 lines up with the first moment the loader can be seen. `reverse: false` is
// required: the phase math below assumes a 0 -> CYCLE_DURATION sawtooth that
// jumps back to 0. The wrap is invisible (every letter sits at 0, the B at
// 360deg === 0deg at cycle end).
function ensureLoadingClockStarted() {
  if (clockGlobal.__bambinoLoadingClockStarted) return;
  clockGlobal.__bambinoLoadingClockStarted = true;
  loadingClock.value = withRepeat(
    withTiming(CYCLE_DURATION, { duration: CYCLE_DURATION, easing: Easing.linear }),
    -1,
    false,
  );
}

// Map the linear clock (t in [0, CYCLE_DURATION)) to a letter's vertical offset,
// reproducing the previous wait -> up -> down -> wait sequence frame-for-frame.
// Up: BOUNCE_HEIGHT * easeOutCubic(p). Down: BOUNCE_HEIGHT * (1 - easeBounce(p))
// — this matches withTiming's `from + (to - from) * easing(p)` interpolation
// from BOUNCE_HEIGHT back to 0 (NOT easeBounce(1 - p), which is a different curve).
function letterTranslateY(t: number, index: number, isFirstB: boolean): number {
  'worklet';
  const stagger = index * STAGGER;
  const upDur = isFirstB ? B_BOUNCE_UP : BOUNCE_UP;
  const downDur = isFirstB ? B_BOUNCE_DOWN : BOUNCE_DOWN;
  const local = t - stagger;
  if (local < 0) return 0;
  if (local < upDur) {
    return easeOutCubic(local / upDur) * BOUNCE_HEIGHT;
  }
  if (local < upDur + downDur) {
    const p = (local - upDur) / downDur;
    return BOUNCE_HEIGHT * (1 - easeBounce(p));
  }
  return 0;
}

// The first B spins 0 -> 360 over its bounce window, then holds at 360 (visually
// identical to 0) until the cycle wraps.
function bRotateY(t: number): number {
  'worklet';
  if (t < B_SPIN_DUR) {
    return easeInOutCubic(t / B_SPIN_DUR) * 360;
  }
  return 360;
}

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
  const translateY = useDerivedValue(
    () => letterTranslateY(loadingClock.value, index, isFirstB),
    [index, isFirstB],
  );
  const rotateY = useDerivedValue(() => (isFirstB ? bRotateY(loadingClock.value) : 0), [isFirstB]);

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
  /** When false, the animation completes one more cycle then exits. */
  isLoading?: boolean;
  /** Called after the exit (fade-out, or immediately when fadeOnExit is false). */
  onFinished?: () => void;
  /**
   * Fade the loader's opacity to 0 before calling onFinished. Defaults to true.
   * Set false when this loader hands off to ANOTHER loader (e.g. the root
   * AuthGate -> the tabs/swipe gates): fading to blank then snapping the next
   * loader back to full opacity reads as a flash. With the shared bounce clock
   * the next loader continues in-phase, so an instant hand-off is seamless.
   */
  fadeOnExit?: boolean;
}

const TIMEOUT_MS = 15000;

export function LoadingScreen({
  isLoading = true,
  onFinished,
  fadeOnExit = true,
}: LoadingScreenProps) {
  const { colors } = useTheme();
  const containerOpacity = useSharedValue(1);
  const [timedOut, setTimedOut] = useState(false);

  // Start the shared bounce clock on first mount (idempotent across instances).
  useEffect(() => {
    ensureLoadingClockStarted();
  }, []);

  const handleFinished = useCallback(() => {
    onFinished?.();
  }, [onFinished]);

  useEffect(() => {
    if (!isLoading) {
      // Wait one full cycle so the current animation completes, then exit.
      const timeout = setTimeout(() => {
        if (!fadeOnExit) {
          // Hand off without fading — the next loader continues the shared
          // clock in-phase, so an instant swap is seamless (no opacity dip).
          handleFinished();
          return;
        }
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
  }, [isLoading, containerOpacity, handleFinished, fadeOnExit]);

  useEffect(() => {
    if (!isLoading) return;
    const timeout = setTimeout(() => setTimedOut(true), TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <GradientBackground animateEntrance={false}>
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
