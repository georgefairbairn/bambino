import {
  EXIT_X,
  EXIT_Y,
  MAX_ROTATION,
  PEEK_SCALE,
  PEEK_TRANSLATE_Y,
  ROTATION_RANGE,
  SWIPE_THRESHOLD,
} from './device';

/**
 * Piecewise-linear interpolation with clamping at both ends, matching
 * Reanimated's interpolate(..., Extrapolation.CLAMP).
 */
export const interpolate = (
  value: number,
  input: readonly number[],
  output: readonly number[],
): number => {
  if (value <= input[0]!) return output[0]!;
  const last = input.length - 1;
  if (value >= input[last]!) return output[last]!;
  for (let i = 1; i <= last; i++) {
    if (value <= input[i]!) {
      const t = (value - input[i - 1]!) / (input[i]! - input[i - 1]!);
      return output[i - 1]! + t * (output[i]! - output[i - 1]!);
    }
  }
  return output[last]!;
};

export interface CardVisuals {
  translateX: number;
  translateY: number;
  rotate: number;
  borderWidth: number;
  contentOpacity: number;
  likeGradientOpacity: number;
  nopeGradientOpacity: number;
  likeOverlayOpacity: number;
  nopeOverlayOpacity: number;
  likeStampScale: number;
  likeStampRotate: number;
  nopeStampScale: number;
  nopeStampRotate: number;
}

/**
 * Every visual on a swiping card, derived from its horizontal position in
 * points. Each range below is copied from components/swipe/swipe-card.tsx and
 * hooks/use-card-animation.ts, so the ad swipe is the app swipe.
 */
export const getCardVisuals = (x: number): CardVisuals => {
  const p = x / SWIPE_THRESHOLD;
  const a = Math.abs(p);
  return {
    translateX: x,
    // EXIT_Y is applied as translateY * -0.3 ("dampen vertical, bias upward").
    translateY: EXIT_Y * -0.3 * Math.min(1, Math.abs(x) / EXIT_X),
    rotate: interpolate(x, [-ROTATION_RANGE, 0, ROTATION_RANGE], [MAX_ROTATION, 0, -MAX_ROTATION]),
    borderWidth: interpolate(a, [0, 0.5], [5, 0]),
    contentOpacity: interpolate(a, [0, 0.5], [1, 0]),
    likeGradientOpacity: interpolate(p, [0, 0.3, 1], [0, 0.5, 1]),
    nopeGradientOpacity: interpolate(-p, [0, 0.3, 1], [0, 0.5, 1]),
    likeOverlayOpacity: interpolate(p, [0, 0.1, 0.25], [0, 0.5, 1]),
    nopeOverlayOpacity: interpolate(-p, [0, 0.1, 0.25], [0, 0.5, 1]),
    likeStampScale: interpolate(p, [0, 0.2, 0.5, 0.7], [0.6, 0.8, 1.2, 1]),
    likeStampRotate: interpolate(p, [0, 0.3, 0.6], [0, -8, 0]),
    nopeStampScale: interpolate(-p, [0, 0.2, 0.5, 0.7], [0.6, 0.8, 1.2, 1]),
    nopeStampRotate: interpolate(-p, [0, 0.3, 0.6], [0, 8, 0]),
  };
};

/** The card waiting behind, which comes forward as the top card leaves. */
export const getPeekVisuals = (frontX: number): { scale: number; translateY: number } => {
  const t = Math.min(1, Math.abs(frontX) / EXIT_X);
  return {
    scale: PEEK_SCALE + (1 - PEEK_SCALE) * t,
    translateY: PEEK_TRANSLATE_Y * (1 - t),
  };
};

/**
 * Horizontal position through a swipe, t running 0 → 1. Eases in so the card
 * lingers near rest long enough for the stamp and colour flood to read, then
 * accelerates off screen the way a flicked card does.
 */
export const getSwipeX = (t: number, direction: -1 | 1): number => {
  const c = Math.min(1, Math.max(0, t));
  const eased = c * c * (3 - 2 * c) * 0.35 + c * c * c * 0.65;
  return direction * EXIT_X * eased;
};
