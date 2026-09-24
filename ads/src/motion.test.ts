import { describe, expect, it } from 'vitest';
import { DURATION_IN_FRAMES } from './compositions';
import {
  FADE_FRAMES,
  NUDGE_PX,
  SWAY_PX,
  getHeadlineWordProgress,
  getPhoneDrift,
  getWordPop,
} from './motion';
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

describe('getWordPop', () => {
  it('starts invisible and lands exactly on the final state', () => {
    expect(getWordPop(0).opacity).toBe(0);
    expect(getWordPop(1)).toEqual({ opacity: 1, scale: 1, rise: 0 });
  });

  it('overshoots a little on the way in, so each word pops rather than slides', () => {
    const peak = Math.max(...Array.from({ length: 101 }, (_, i) => getWordPop(i / 100).scale));
    expect(peak).toBeGreaterThan(1.03);
    expect(peak).toBeLessThan(1.08);
  });
});

describe('getPhoneDrift', () => {
  const swipes = [
    { swipe: [104, 116], direction: -1 },
    { swipe: [152, 164], direction: 1 },
  ] as const;

  it('stays within a few pixels, so it reads as life rather than movement', () => {
    for (let f = 0; f < DURATION_IN_FRAMES; f++) {
      expect(Math.abs(getPhoneDrift(f, swipes))).toBeLessThanOrEqual(SWAY_PX + NUDGE_PX);
    }
  });

  it('moves smoothly, with no jumps between frames', () => {
    for (let f = 1; f < DURATION_IN_FRAMES; f++) {
      expect(Math.abs(getPhoneDrift(f, swipes) - getPhoneDrift(f - 1, swipes))).toBeLessThan(2);
    }
  });

  it('leans toward each swipe, then eases back', () => {
    const sway = (f: number) => getPhoneDrift(f, []);
    expect(getPhoneDrift(116, swipes) - sway(116)).toBeCloseTo(-NUDGE_PX, 5);
    expect(getPhoneDrift(164, swipes) - sway(164)).toBeCloseTo(NUDGE_PX, 5);
    expect(getPhoneDrift(200, swipes) - sway(200)).toBe(0);
  });

  it('sways two phones out of step when given half a period apart', () => {
    expect(getPhoneDrift(30, [], 0)).toBeCloseTo(-getPhoneDrift(30, [], 60), 5);
  });
});
