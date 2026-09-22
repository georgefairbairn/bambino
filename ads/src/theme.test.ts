import { describe, expect, it } from 'vitest';
import {
  AD_THEMES,
  BACKDROP,
  CARD,
  GENDER_BADGES,
  HEADLINE_COLOR,
  SWIPE_COLORS,
  UNDERLINE_COLORS,
} from './theme';

const HEX = /^#[0-9A-F]{6}$/;

describe('ad theme tokens', () => {
  it('offers exactly the two partner themes', () => {
    expect(Object.keys(AD_THEMES)).toEqual(['mint', 'blue']);
  });

  it('never uses the nope colour as a partner primary', () => {
    // #FF5C8A is SWIPE_COLORS.nope. A pink partner would read as the rejecting one.
    const primaries = Object.values(AD_THEMES).map((t) => t.primary);
    expect(primaries).not.toContain(SWIPE_COLORS.nope);
  });

  it('uses the swipe colours from constants/swipe.ts verbatim', () => {
    expect(SWIPE_COLORS.like).toBe('#34C77B');
    expect(SWIPE_COLORS.nope).toBe('#FF5C8A');
  });

  it('uses the headline green sampled from the App Store stills', () => {
    expect(HEADLINE_COLOR).toBe('#059669');
  });

  it('uses the backdrop tones sampled from the App Store stills', () => {
    expect(BACKDROP.base).toBe('#EFFDF4');
    expect(BACKDROP.circle).toBe('#E1FCEC');
  });

  it('carries an underline colour for every gender the cast can use', () => {
    expect(Object.keys(UNDERLINE_COLORS).sort()).toEqual(['female', 'male', 'neutral']);
  });

  it('carries a badge for every gender the cast can use', () => {
    expect(Object.keys(GENDER_BADGES).sort()).toEqual(['female', 'male', 'neutral']);
  });

  it('reproduces the real card style from swipe-card.tsx, not the v1 guess', () => {
    // v1 used cream #FFFBF5 at radius 24 with no border, which is why the
    // cards did not look like the app's.
    expect(CARD.backgroundColor).toBe('#FFFFFF');
    expect(CARD.borderRadius).toBe(16);
    expect(CARD.borderWidth).toBe(5);
  });

  it('expresses every colour as a six-digit uppercase hex', () => {
    const colours = [
      HEADLINE_COLOR,
      BACKDROP.base,
      BACKDROP.circle,
      CARD.backgroundColor,
      CARD.nameColor,
      ...Object.values(AD_THEMES).flatMap((t) => [t.surfaceSubtle, t.tabActive, t.secondaryLight]),
      ...Object.values(SWIPE_COLORS),
      ...Object.values(UNDERLINE_COLORS),
      ...Object.values(AD_THEMES).map((t) => t.primary),
    ];
    for (const c of colours) expect(c).toMatch(HEX);
  });
});
