/** Frames the end card runs for: from the phone clearing (534) to 600. */
export const END_CARD_FRAMES = 66;

export interface EndCardPhases {
  /** 0 → 1 as "bambino" arrives. */
  wordmark: number;
  /** 0 → 1 as "ambino" folds into the "b". */
  collapse: number;
  /** 0 → 1 as the icon's rounded square grows behind the "b". */
  icon: number;
  /** 0 → 1 as "Free to download on the App Store" arrives. */
  tagline: number;
}

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
  collapse: easeInOut(span(p, 0.33, 0.55)),
  icon: easeOut(span(p, 0.42, 0.62)),
});
