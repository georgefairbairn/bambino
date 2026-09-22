import { describe, expect, it } from 'vitest';
import { CAST, NAMES_AVAILABLE, getOriginFlag, getPeak, getTier, getTrend } from './names';
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
      expect(getOriginFlag(entry.origin)).not.toBe('\u{1F30D}');
      expect(UNDERLINE_COLORS).toHaveProperty(entry.gender);
    }
  });

  it('gives the matched name twenty contiguous years to chart, ending on its rank', () => {
    const { history, rank } = CAST.esme;
    expect(history).toHaveLength(20);
    expect(history[0]).toEqual([2004, 2294]);
    expect(history[19]).toEqual([2023, rank]);
    for (let i = 1; i < history.length; i++) expect(history[i]![0]).toBe(history[i - 1]![0] + 1);
  });

  it('carries the ranked total the sheet quotes, from production', () => {
    expect(CAST.esme.rankedOutOf).toBe(5640);
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

describe('getTier — mirrors constants/popularity.ts', () => {
  it('buckets ranks exactly at the app boundaries', () => {
    expect(getTier(50).label).toBe('Extremely Popular');
    expect(getTier(51).label).toBe('Very Popular');
    expect(getTier(200).label).toBe('Very Popular');
    expect(getTier(325).label).toBe('Popular');
    expect(getTier(1000).label).toBe('Uncommon');
    expect(getTier(1001).label).toBe('Rare');
  });

  it("gives Esme the app's Popular gradient", () => {
    expect(getTier(CAST.esme.rank).gradient).toEqual(['#FBBF24', '#D97706']);
  });
});

describe('getPeak', () => {
  it("finds the best-ranked year in the matched name's history", () => {
    expect(getPeak(CAST.esme.history)).toEqual([2022, 303]);
  });
});

describe('getOriginFlag — mirrors constants/origins.ts', () => {
  it('covers origins beyond the cast, so a variant still gets a flag', () => {
    expect(getOriginFlag('Irish')).toBe('\u{1F1EE}\u{1F1EA}');
    expect(getOriginFlag('Hebrew')).toBe('\u{1F1EE}\u{1F1F1}');
  });

  it("falls back to the app's globe for an unknown origin", () => {
    expect(getOriginFlag('Atlantean')).toBe('\u{1F30D}');
  });
});
