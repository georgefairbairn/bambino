export type BeatId =
  | 'card-fan'
  | 'phone-enter'
  | 'solo-swipes'
  | 'partner-join'
  | 'out-of-sync'
  | 'stillness'
  | 'match-fuse'
  | 'together'
  | 'end-card';

export type HeadlineIndex = 0 | 1 | 2 | 3;

export interface Beat {
  id: BeatId;
  from: number;
  durationInFrames: number;
  /** Index into HEADLINES, or null for a beat that carries no text. */
  headlineIndex: HeadlineIndex | null;
}

/** Approved copy. Used verbatim, in this order. */
export const HEADLINES = [
  '13,000 baby names.',
  'You swipe.',
  'So does your partner.',
  'The names you both like become matches.',
] as const satisfies readonly [string, string, string, string];

/**
 * 450 frames at 30fps. Beats are contiguous; the test suite enforces that.
 *
 * `stillness` carries no headline on purpose. One full second where nothing
 * moves and nothing is written is what makes the match land.
 */
export const BEATS: readonly Beat[] = [
  { id: 'card-fan', from: 0, durationInFrames: 60, headlineIndex: 0 },
  { id: 'phone-enter', from: 60, durationInFrames: 30, headlineIndex: 1 },
  { id: 'solo-swipes', from: 90, durationInFrames: 90, headlineIndex: 1 },
  { id: 'partner-join', from: 180, durationInFrames: 30, headlineIndex: 2 },
  { id: 'out-of-sync', from: 210, durationInFrames: 90, headlineIndex: 2 },
  { id: 'stillness', from: 300, durationInFrames: 30, headlineIndex: null },
  { id: 'match-fuse', from: 330, durationInFrames: 30, headlineIndex: null },
  { id: 'together', from: 360, durationInFrames: 30, headlineIndex: null },
  { id: 'end-card', from: 390, durationInFrames: 60, headlineIndex: 3 },
] as const;

export const getBeat = (frame: number): Beat => {
  for (const beat of BEATS) {
    if (frame < beat.from + beat.durationInFrames) return beat;
  }
  return BEATS[BEATS.length - 1]!;
};

export const getHeadline = (
  frame: number,
  headlines: readonly string[] = HEADLINES,
): string | null => {
  const index = getBeat(frame).headlineIndex;
  return index === null ? null : (headlines[index] ?? null);
};

/**
 * The frame a headline first appeared on, walking back through any earlier
 * contiguous beats that carry the same text.
 *
 * Several beats deliberately share a headline (phone-enter and solo-swipes,
 * partner-join and out-of-sync). Anchoring the word reveal to the current
 * beat instead would make the line pop back to one word and re-type itself
 * halfway through. Returns null for a beat that carries no headline.
 */
export const getHeadlineStart = (frame: number): number | null => {
  const current = getBeat(frame);
  if (current.headlineIndex === null) return null;

  let start = current.from;
  for (let i = BEATS.indexOf(current) - 1; i >= 0; i--) {
    const previous = BEATS[i]!;
    if (previous.headlineIndex !== current.headlineIndex) break;
    start = previous.from;
  }
  return start;
};
