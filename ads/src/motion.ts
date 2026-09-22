import { HEADLINE_EXIT_FRAMES, getHeadlineStart, getOutgoingHeadline } from './timeline';

/** Words per second for the headline reveal. */
const WORDS_PER_SECOND = 6;
/** Frames each word takes to fade and rise into place. */
export const FADE_FRAMES = 5;
/** A new line waits this long so the outgoing one has cleared half its exit. */
const ENTER_DELAY = HEADLINE_EXIT_FRAMES / 2;

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** Per-word reveal progress, 0 → 1, for the headline showing on `frame`. */
export const getHeadlineWordProgress = (frame: number, fps: number, wordCount: number): number[] => {
  const start = getHeadlineStart(frame);
  if (start === null || wordCount === 0) return [];
  // Decide the delay once, from the frame this line began. Checking whether a
  // line is leaving *now* switched the delay off the moment the exit window
  // closed, jumping the reveal four frames and popping a word into view.
  const delay = getOutgoingHeadline(start) ? ENTER_DELAY : 0;
  const local = frame - start - delay;
  const framesPerWord = fps / WORDS_PER_SECOND;
  return Array.from({ length: wordCount }, (_, i) => clamp01((local - i * framesPerWord) / FADE_FRAMES));
};
