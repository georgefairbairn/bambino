import { describe, expect, it } from 'vitest';
import { CAST } from './names';
import { UNDERLINE_COLORS } from './theme';

describe('name cast', () => {
  it('casts the five names the spec calls for', () => {
    expect(Object.keys(CAST).sort()).toEqual(['esme', 'juniper', 'olivia', 'otto', 'wren']);
  });

  it('matches on Esme, which is the hero card on the App Store listing', () => {
    expect(CAST.esme.name).toBe('Esme');
    expect(CAST.esme.origin).toBe('French');
    expect(CAST.esme.rank).toBe(325);
  });

  it('rejects Olivia, the number one name, as the opening joke', () => {
    expect(CAST.olivia.rank).toBe(1);
  });

  it('gives every cast member a gender the card can colour', () => {
    for (const entry of Object.values(CAST)) {
      expect(UNDERLINE_COLORS).toHaveProperty(entry.gender);
    }
  });

  it('gives every cast member a real production rank', () => {
    for (const entry of Object.values(CAST)) {
      expect(entry.rank).toBeGreaterThan(0);
      expect(Number.isInteger(entry.rank)).toBe(true);
    }
  });
});
