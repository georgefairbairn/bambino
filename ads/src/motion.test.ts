import { describe, expect, it } from 'vitest';
import { DURATION_IN_FRAMES } from './compositions';
import { FADE_FRAMES, getHeadlineWordProgress } from './motion';
import { HEADLINES, getBeat, getHeadlineStart } from './timeline';

const FPS = 30;
const wordsAt = (frame: number) => {
  const index = getBeat(frame).headlineIndex;
  return index === null ? 0 : HEADLINES[index].split(' ').length;
};

describe('getHeadlineWordProgress', () => {
  it('shows nothing when the slot is empty', () => {
    expect(getHeadlineWordProgress(560, FPS, 0)).toEqual([]);
  });

  it('holds a new line back while the previous one clears', () => {
    // Match line starts at 265 with the partner line still leaving.
    expect(getHeadlineWordProgress(265, FPS, 7)[0]).toBe(0);
  });

  it('reveals words left to right', () => {
    const p = getHeadlineWordProgress(275, FPS, 7);
    for (let i = 1; i < p.length; i++) expect(p[i]!).toBeLessThanOrEqual(p[i - 1]!);
    expect(p[0]).toBeGreaterThan(0);
  });

  it('finishes the longest headline within about a second', () => {
    const words = 'The names you both like become matches'.split(' ').length;
    const p = getHeadlineWordProgress(265 + 40, FPS, words);
    expect(p.every((v) => v === 1)).toBe(true);
  });

  it('never pops a word: at most one fade step per frame, across the whole ad', () => {
    // The enter delay used to switch off the moment the exit window closed,
    // which jumped the reveal four frames and popped a word to 80% opacity.
    for (let f = 1; f < DURATION_IN_FRAMES; f++) {
      if (getHeadlineStart(f) !== getHeadlineStart(f - 1)) continue;
      const n = wordsAt(f);
      const a = getHeadlineWordProgress(f - 1, FPS, n);
      const b = getHeadlineWordProgress(f, FPS, n);
      for (let i = 0; i < n; i++) {
        expect(Math.abs(b[i]! - a[i]!)).toBeLessThanOrEqual(1 / FADE_FRAMES + 1e-9);
      }
    }
  });
});
