import { describe, expect, it } from 'vitest';
import { COMPOSITION_IDS, DURATION_IN_FRAMES, FORMAT_SIZES, FPS } from './compositions';

describe('composition registry', () => {
  it('runs for exactly 20 seconds at 30fps', () => {
    expect(FPS).toBe(30);
    expect(DURATION_IN_FRAMES).toBe(600);
    expect(DURATION_IN_FRAMES / FPS).toBe(20);
  });

  it('registers one composition per ad format', () => {
    expect(Object.keys(COMPOSITION_IDS)).toEqual(['reel', 'feed', 'square']);
  });

  it('gives every format a unique composition id', () => {
    const ids = Object.values(COMPOSITION_IDS);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('sizes every format to a 1080px width for Meta delivery', () => {
    for (const size of Object.values(FORMAT_SIZES)) {
      expect(size.width).toBe(1080);
      expect(size.height).toBeGreaterThan(0);
    }
  });

  it('uses the placement dimensions Meta expects', () => {
    expect(FORMAT_SIZES.reel).toEqual({ width: 1080, height: 1920 });
    expect(FORMAT_SIZES.feed).toEqual({ width: 1080, height: 1350 });
    expect(FORMAT_SIZES.square).toEqual({ width: 1080, height: 1080 });
  });
});
