import { DURATION_IN_FRAMES } from './compositions';

/**
 * The frame the last phone has fully cleared, and the end card begins. The
 * scene ends the phone's exit on this same frame, so the logo can't be drawn
 * over a phone that is still on screen.
 */
export const END_CARD_START = 534;
export const END_CARD_FRAMES = DURATION_IN_FRAMES - END_CARD_START;

export interface EndCardPhases {
  /** 0 → 1 as "bambino" arrives. */
  wordmark: number;
  /** 0 → 1 as "ambino" folds into the "b". */
  collapse: number;
  /** 0 → 1 as the icon's rounded square grows behind the "b". */
  icon: number;
  /** 0 → 1 as "Free to download" arrives. */
  tagline: number;
  /**
   * Apple's App Store badge, which must not be animated: it cuts in, fully
   * formed, halfway through the tagline's arrival and never moves.
   */
  badge: 0 | 1;
}

/**
 * Apple's black "Download on the App Store" badge (public/app-store-badge.svg,
 * from toolbox.marketingtools.apple.com). Sizes in px at 1080 wide.
 */
export const BADGE = {
  /** Apple's onscreen minimum is 40; 80 stays secondary to the icon and tagline. */
  height: 80,
  /** Aspect of Apple's artwork (viewBox 119.66407 × 40). */
  width: (80 * 119.66407) / 40,
  /**
   * Top edge below the frame's centre. The tagline slides down while the
   * wordmark folds into the icon, so the badge is pinned under the tagline's
   * resting place rather than following it.
   */
  top: 140,
} as const;

/** The in-app purchases disclosure, in px at 1080 wide. */
export const FINE_PRINT_PX = 24;

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const span = (p: number, from: number, to: number) => clamp01((p - from) / (to - from));

/**
 * The wordmark shows first, holds, then folds down into the app icon: the
 * icon IS the wordmark's "b" in Alfa Slab One on a mint square, so collapsing
 * "ambino" to zero width leaves the "b" exactly where the icon's glyph sits.
 *
 * `p` runs 0 → 1 across END_CARD_FRAMES.
 */
export const getEndCardPhases = (p: number): EndCardPhases => ({
  wordmark: easeOut(span(p, 0, 0.18)),
  tagline: easeOut(span(p, 0.12, 0.3)),
  badge: span(p, 0.12, 0.3) >= 0.5 ? 1 : 0,
  collapse: easeInOut(span(p, 0.33, 0.55)),
  icon: easeOut(span(p, 0.42, 0.62)),
});
