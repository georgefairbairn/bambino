import { describe, expect, it } from 'vitest';
import { CAST, ESME_TWENTY_YEARS, NAMES_AVAILABLE, ORIGIN_FLAGS, getTrend } from './names';
import { UNDERLINE_COLORS } from './theme';

describe('name cast', () => {
  it('casts the five names the tour uses', () => {
    expect(Object.keys(CAST).sort()).toEqual(['esme', 'juniper', 'olivia', 'otto', 'wren']);
  });

  it('matches on Esme, the hero card on the App Store listing', () => {
    expect(CAST.esme.origin).toBe('French');
    expect(CAST.esme.rank).toBe(325);
  });

  it('carries ten years of real ranks ending on the current rank', () => {
    for (const entry of Object.values(CAST)) {
      expect(entry.tenYearRanks).toHaveLength(10);
      expect(entry.tenYearRanks[9]).toBe(entry.rank);
    }
  });

  it('gives every cast member a meaning, a flag and a colourable gender', () => {
    for (const entry of Object.values(CAST)) {
      expect(entry.meaning.length).toBeGreaterThan(40);
      expect(ORIGIN_FLAGS[entry.origin]).toBeDefined();
      expect(UNDERLINE_COLORS).toHaveProperty(entry.gender);
    }
  });

  it('charts twenty contiguous years for Esme', () => {
    expect(ESME_TWENTY_YEARS).toHaveLength(20);
    expect(ESME_TWENTY_YEARS[0]).toEqual([2004, 2294]);
    expect(ESME_TWENTY_YEARS[19]).toEqual([2023, 325]);
  });

  it('uses the verified filter counts', () => {
    expect(NAMES_AVAILABLE).toEqual({ all: 13359, celebrity: 295 });
  });
});

describe('getTrend — mirrors convex/popularity.ts', () => {
  it('reads Olivia as steady, since 2 → 1 is inside the ten-place dead band', () => {
    expect(getTrend(CAST.olivia.tenYearRanks)).toBe('steady');
  });

  it('reads the other four as rising', () => {
    for (const key of ['otto', 'juniper', 'wren', 'esme'] as const) {
      expect(getTrend(CAST[key].tenYearRanks)).toBe('rising');
    }
  });

  it('reads a ten-place slide as falling', () => {
    expect(getTrend([100, 100, 100, 100, 100, 100, 100, 100, 100, 110])).toBe('falling');
  });

  it('declines to call a trend without five years of history', () => {
    expect(getTrend([10, 9, 8])).toBeNull();
  });
});
