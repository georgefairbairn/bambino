import { describe, expect, it } from 'vitest';
import {
  COMPOSITION_IDS,
  DURATION_IN_FRAMES,
  FORMAT_SIZES,
  FPS,
  PACE_FRAMES,
  SHORT_CUT,
  SPLIT_END,
  toStoryFrame,
} from './compositions';

describe('composition registry', () => {
  it('runs for exactly 20 seconds at 30fps', () => {
    expect(FPS).toBe(30);
    expect(DURATION_IN_FRAMES).toBe(600);
    expect(DURATION_IN_FRAMES / FPS).toBe(20);
  });

  it('registers one composition per ad format', () => {
    expect(Object.keys(COMPOSITION_IDS)).toEqual(['reel', 'feed', 'square', 'landscape']);
  });

  it('gives every format a unique composition id', () => {
    const ids = Object.values(COMPOSITION_IDS);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('sizes every format to 1080px on its short side for Meta delivery', () => {
    for (const size of Object.values(FORMAT_SIZES)) {
      expect(Math.min(size.width, size.height)).toBe(1080);
    }
  });

  it('uses the placement dimensions Meta expects', () => {
    expect(FORMAT_SIZES.reel).toEqual({ width: 1080, height: 1920 });
    expect(FORMAT_SIZES.feed).toEqual({ width: 1080, height: 1350 });
    expect(FORMAT_SIZES.square).toEqual({ width: 1080, height: 1080 });
    expect(FORMAT_SIZES.landscape).toEqual({ width: 1920, height: 1080 });
  });
});

describe('pace', () => {
  it("runs the short cut for exactly 15 seconds, Meta's recommended length", () => {
    expect(PACE_FRAMES.full).toBe(DURATION_IN_FRAMES);
    expect(PACE_FRAMES.short / FPS).toBe(15);
  });

  it('plays the full cut frame for frame', () => {
    for (const f of [0, 1, 299, 599]) expect(toStoryFrame(f, 'full')).toBe(f);
  });

  it('plays the whole story in the short cut, ending on the end card', () => {
    expect(toStoryFrame(0, 'short')).toBe(0);
    expect(toStoryFrame(PACE_FRAMES.short - 1, 'short')).toBeGreaterThan(DURATION_IN_FRAMES - 3);
    expect(toStoryFrame(PACE_FRAMES.short - 1, 'short')).toBeLessThanOrEqual(
      DURATION_IN_FRAMES - 1,
    );
  });

  it('plays every run in order, never faster than 2.5x', () => {
    for (let i = 1; i < SHORT_CUT.length; i++) {
      expect(SHORT_CUT[i]!.from).toBeGreaterThanOrEqual(SHORT_CUT[i - 1]!.to);
    }
    for (const run of SHORT_CUT) expect(run.speed).toBeLessThanOrEqual(2.5);
  });

  it('plays every swipe, the match and the end card at normal speed', () => {
    const at = (story: number) => SHORT_CUT.find((r) => story >= r.from && story < r.to);
    for (const story of [104, 128, 152, 214, 232, 290, 305, 360, 400, 534, 580]) {
      expect(at(story)?.speed).toBe(1);
    }
  });

  it('skips the solo Filters and popularity sections', () => {
    const shown = (story: number) => SHORT_CUT.some((r) => story >= r.from && story < r.to);
    expect(shown(SPLIT_END)).toBe(false);
    expect(shown(470)).toBe(false);
    expect(shown(518)).toBe(true);
  });

  it('never runs story time backwards', () => {
    let previous = -1;
    for (let f = 0; f < PACE_FRAMES.short; f++) {
      const story = toStoryFrame(f, 'short');
      expect(story).toBeGreaterThan(previous);
      previous = story;
    }
  });
});
