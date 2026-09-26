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

import { type Pace } from './compositions';

export type HeadlineIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Beat {
  id: BeatId;
  section: SectionId;
  from: number;
  durationInFrames: number;
  /** Index into HEADLINES, or null when the slot is empty. */
  headlineIndex: HeadlineIndex | null;
}

/**
 * The opening question, A/B tested in the first campaign (George, 2026-09-23).
 * Each is set in the lines it breaks at on screen. "baby name?" always ends
 * alone on the last line, because the Hook layer underlines the last line
 * like the card's own gender underline.
 */
export const HOOKS = {
  looking: ['Looking for a', 'baby name?'],
  'cant-agree': ['Can’t agree on a', 'baby name?'],
} as const satisfies Record<string, readonly string[]>;

export type HookId = keyof typeof HOOKS;

export const HOOK_IDS = Object.keys(HOOKS) as HookId[];

export const DEFAULT_HOOK: HookId = 'looking';

/**
 * Approved copy, used verbatim, after the hook. "Swipe through thousands of
 * names" is George's own wording; "Link up with your partner" and the match
 * line are the existing App Store headlines. No trailing full stops, matching
 * the published screenshots.
 */
const SECTION_HEADLINES = [
  'Swipe through thousands of names',
  'Link up with your partner',
  'The names you both like become matches',
  'Filter by style, origin or gender',
  'See how popular it really is',
  // The 15s cut's side-by-side beat, over both features (George, 2026-09-25).
  'Filter names and see how popular they are',
] as const;

/** Headline 0 is the hook question, which the Hook layer draws itself. */
export const getHeadlines = (hook: HookId): readonly [string, ...typeof SECTION_HEADLINES] => [
  HOOKS[hook].join(' '),
  ...SECTION_HEADLINES,
];

export const HEADLINES = getHeadlines(DEFAULT_HOOK);

export const BEATS: readonly Beat[] = [
  { id: 'hook', section: 'hook', from: 0, durationInFrames: 75, headlineIndex: 0 },
  { id: 'phone-enter', section: 'swipe', from: 75, durationInFrames: 25, headlineIndex: 1 },
  { id: 'solo-swipes', section: 'swipe', from: 100, durationInFrames: 80, headlineIndex: 1 },
  // The partner line runs while their phone arrives and they swipe
  // independently; the match line lands as both settle on the same name.
  { id: 'partner-join', section: 'match', from: 180, durationInFrames: 25, headlineIndex: 2 },
  { id: 'out-of-sync', section: 'match', from: 205, durationInFrames: 60, headlineIndex: 2 },
  { id: 'stillness', section: 'match', from: 265, durationInFrames: 25, headlineIndex: 3 },
  { id: 'match-swipe', section: 'match', from: 290, durationInFrames: 15, headlineIndex: 3 },
  { id: 'celebration', section: 'match', from: 305, durationInFrames: 40, headlineIndex: 3 },
  { id: 'to-filters', section: 'filters', from: 345, durationInFrames: 27, headlineIndex: 4 },
  { id: 'filters', section: 'filters', from: 372, durationInFrames: 63, headlineIndex: 4 },
  { id: 'to-detail', section: 'popularity', from: 435, durationInFrames: 17, headlineIndex: 5 },
  { id: 'popularity', section: 'popularity', from: 452, durationInFrames: 66, headlineIndex: 5 },
  { id: 'end', section: 'end', from: 518, durationInFrames: 82, headlineIndex: null },
] as const;

/**
 * The 15s cut, in the same story frames. It never reaches 422–518 (see
 * SHORT_CUT), and the side-by-side beat from 345 carries the combined line.
 */
export const BEATS_SHORT: readonly Beat[] = BEATS.map((beat) =>
  beat.section === 'filters' || beat.section === 'popularity'
    ? { ...beat, headlineIndex: 6 as const }
    : beat,
);

export const getBeats = (pace: Pace): readonly Beat[] => (pace === 'short' ? BEATS_SHORT : BEATS);

/** How long an outgoing headline takes to clear the slot. */
export const HEADLINE_EXIT_FRAMES = 8;

export const getBeat = (frame: number, beats: readonly Beat[] = BEATS): Beat => {
  for (const beat of beats) {
    if (frame < beat.from + beat.durationInFrames) return beat;
  }
  return beats[beats.length - 1]!;
};

export const getHeadline = (
  frame: number,
  headlines: readonly string[] = HEADLINES,
  beats: readonly Beat[] = BEATS,
): string | null => {
  const index = getBeat(frame, beats).headlineIndex;
  return index === null ? null : (headlines[index] ?? null);
};

/**
 * The frame a headline first appeared on, walking back through earlier
 * contiguous beats that carry the same line. Several beats share a headline;
 * anchoring the word reveal to the current beat re-typed it mid-line.
 */
export const getHeadlineStart = (frame: number, beats: readonly Beat[] = BEATS): number | null => {
  const current = getBeat(frame, beats);
  if (current.headlineIndex === null) return null;
  let start = current.from;
  for (let i = beats.indexOf(current) - 1; i >= 0; i--) {
    const previous = beats[i]!;
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
  beats: readonly Beat[] = BEATS,
): { index: HeadlineIndex; progress: number } | null => {
  const current = getBeat(frame, beats);
  const i = beats.indexOf(current);
  // Walk back to the start of the current headline run.
  let runStart = i;
  while (runStart > 0 && beats[runStart - 1]!.headlineIndex === current.headlineIndex) runStart--;
  if (runStart === 0) return null;
  const previous = beats[runStart - 1]!;
  if (previous.headlineIndex === null) return null;
  const since = frame - beats[runStart]!.from;
  if (since < 0 || since > HEADLINE_EXIT_FRAMES) return null;
  return { index: previous.headlineIndex, progress: since / HEADLINE_EXIT_FRAMES };
};
