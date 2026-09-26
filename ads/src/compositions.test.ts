import { describe, expect, it } from 'vitest';
import {
  COMPOSITION_IDS,
  DURATION_IN_FRAMES,
  FORMAT_SIZES,
  FPS,
  PACE_FRAMES,
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

  it('runs the short cut at 4/3 speed', () => {
    expect(toStoryFrame(150, 'short')).toBe(200);
    expect(toStoryFrame(300, 'short')).toBe(400);
  });
});
