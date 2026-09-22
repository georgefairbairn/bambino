/**
 * The 20-second feature tour: 600 frames at 30fps, six sections, and a
 * persistent headline slot that updates per section. The test suite enforces
 * that beats are contiguous and cover the composition exactly.
 */

export type SectionId = 'hook' | 'swipe' | 'match' | 'filters' | 'popularity' | 'end';

export type BeatId =
  | 'hook'
  | 'phone-enter'
  | 'solo-swipes'
  | 'partner-join'
  | 'out-of-sync'
  | 'stillness'
  | 'match-swipe'
  | 'celebration'
  | 'to-filters'
  | 'filters'
  | 'to-detail'
  | 'popularity'
  | 'end';

export type HeadlineIndex = 0 | 1 | 2 | 3 | 4;

export interface Beat {
  id: BeatId;
  section: SectionId;
  from: number;
  durationInFrames: number;
  /** Index into HEADLINES, or null when the slot is empty. */
  headlineIndex: HeadlineIndex | null;
}

/**
 * Approved copy, used verbatim. The first two lines are George's own wording and
 * the third is the existing App Store headline. No trailing full stops, matching
 * the published App Store screenshots.
 */
export const HEADLINES = [
  'Trying to find the perfect baby name?',
  'Swipe through thousands of names',
  'The names you both like become matches',
  'Filter by style, origin or gender',
  'See how popular it really is',
] as const satisfies readonly [string, string, string, string, string];

export const BEATS: readonly Beat[] = [
  { id: 'hook', section: 'hook', from: 0, durationInFrames: 75, headlineIndex: 0 },
  { id: 'phone-enter', section: 'swipe', from: 75, durationInFrames: 25, headlineIndex: 1 },
  { id: 'solo-swipes', section: 'swipe', from: 100, durationInFrames: 80, headlineIndex: 1 },
  { id: 'partner-join', section: 'match', from: 180, durationInFrames: 25, headlineIndex: 2 },
  { id: 'out-of-sync', section: 'match', from: 205, durationInFrames: 60, headlineIndex: 2 },
  { id: 'stillness', section: 'match', from: 265, durationInFrames: 25, headlineIndex: 2 },
  { id: 'match-swipe', section: 'match', from: 290, durationInFrames: 15, headlineIndex: 2 },
  { id: 'celebration', section: 'match', from: 305, durationInFrames: 40, headlineIndex: 2 },
  { id: 'to-filters', section: 'filters', from: 345, durationInFrames: 27, headlineIndex: 3 },
  { id: 'filters', section: 'filters', from: 372, durationInFrames: 63, headlineIndex: 3 },
  { id: 'to-detail', section: 'popularity', from: 435, durationInFrames: 17, headlineIndex: 4 },
  { id: 'popularity', section: 'popularity', from: 452, durationInFrames: 73, headlineIndex: 4 },
  { id: 'end', section: 'end', from: 525, durationInFrames: 75, headlineIndex: null },
] as const;

/** How long an outgoing headline takes to clear the slot. */
export const HEADLINE_EXIT_FRAMES = 8;

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
 * The frame a headline first appeared on, walking back through earlier
 * contiguous beats that carry the same line. Several beats share a headline;
 * anchoring the word reveal to the current beat re-typed it mid-line.
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

/**
 * The headline that is leaving the slot, for the first few frames after a
 * change. `progress` runs 0 → 1 as it clears. Null once it has gone.
 */
export const getOutgoingHeadline = (
  frame: number,
): { index: HeadlineIndex; progress: number } | null => {
  const current = getBeat(frame);
  const i = BEATS.indexOf(current);
  // Walk back to the start of the current headline run.
  let runStart = i;
  while (runStart > 0 && BEATS[runStart - 1]!.headlineIndex === current.headlineIndex) runStart--;
  if (runStart === 0) return null;
  const previous = BEATS[runStart - 1]!;
  if (previous.headlineIndex === null) return null;
  const since = frame - BEATS[runStart]!.from;
  if (since < 0 || since > HEADLINE_EXIT_FRAMES) return null;
  return { index: previous.headlineIndex, progress: since / HEADLINE_EXIT_FRAMES };
};
