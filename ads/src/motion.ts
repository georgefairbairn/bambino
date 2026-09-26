import {
  BEATS,
  type Beat,
  HEADLINE_EXIT_FRAMES,
  getHeadlineStart,
  getOutgoingHeadline,
} from './timeline';

/**
 * Words per second for the headline reveal. 7 lets the longest line finish
 * its pop before the celebration starts.
 */
const WORDS_PER_SECOND = 7;
/** Frames each word takes to pop into place. Long enough for the overshoot to read. */
export const FADE_FRAMES = 8;
/** A new line waits this long so the outgoing one has cleared half its exit. */
const ENTER_DELAY = HEADLINE_EXIT_FRAMES / 2;

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** Per-word reveal progress, 0 → 1, for the headline showing on `frame`. */
export const getHeadlineWordProgress = (
  frame: number,
  fps: number,
  wordCount: number,
  beats: readonly Beat[] = BEATS,
): number[] => {
  const start = getHeadlineStart(frame, beats);
  if (start === null || wordCount === 0) return [];
  // Decide the delay once, from the frame this line began. Checking whether a
  // line is leaving *now* switched the delay off the moment the exit window
  // closed, jumping the reveal four frames and popping a word into view.
  const delay = getOutgoingHeadline(start, beats) ? ENTER_DELAY : 0;
  const local = frame - start - delay;
  const framesPerWord = fps / WORDS_PER_SECOND;
  return Array.from({ length: wordCount }, (_, i) =>
    clamp01((local - i * framesPerWord) / FADE_FRAMES),
  );
};

/** easeOutBack: runs past 1 by about 10%, then settles exactly on 1. */
const easeOutBack = (t: number) => {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

/**
 * How one headline word looks at its reveal progress `t` (0 → 1): it scales
 * up from half size past full and back, rises into place and fades in over the
 * first half. Lands exactly on scale 1, no offset, fully opaque.
 */
export const getWordPop = (t: number): { opacity: number; scale: number; rise: number } => {
  const c = clamp01(t);
  const back = easeOutBack(c);
  return { opacity: clamp01(c * 2), scale: 0.5 + 0.5 * back, rise: (1 - back) * 0.3 };
};

/** Slow sideways sway, in px at 1080 wide. */
export const SWAY_PX = 6;
/** Follow-through in the direction of a swipe, in px at 1080 wide. */
export const NUDGE_PX = 10;
/** One full sway, in frames (4 s at 30fps). */
export const SWAY_PERIOD = 120;
/** Frames the follow-through takes to settle back after the swipe lands. */
const NUDGE_SETTLE = 24;

const easeInOutSine = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;

/**
 * A phone's sideways offset on `frame`, so it never sits dead still: a slow
 * sway plus a small lean toward each swipe that eases back once the card has
 * gone. `phase` offsets the sway so two phones don't move in lockstep.
 * `swayFrame` is the output frame, so the sway stays smooth where the 15s cut
 * speeds up or skips story time; the nudges follow the story's swipes.
 */
export const getPhoneDrift = (
  frame: number,
  swipes: readonly { swipe: readonly [number, number]; direction: -1 | 1 }[],
  phase = 0,
  swayFrame = frame,
): number => {
  const sway = SWAY_PX * Math.sin((2 * Math.PI * (swayFrame + phase)) / SWAY_PERIOD);
  let nudge = 0;
  for (const { swipe, direction } of swipes) {
    const [start, end] = swipe;
    if (frame <= start || frame >= end + NUDGE_SETTLE) continue;
    const t = frame <= end ? (frame - start) / (end - start) : 1 - (frame - end) / NUDGE_SETTLE;
    nudge += direction * NUDGE_PX * easeInOutSine(t);
  }
  return sway + nudge;
};
