import { describe, expect, it } from 'vitest';
import { AD_FORMATS, FORMAT_SIZES } from './compositions';
import { CARD_H, CARD_Y, PHONE_W } from './device';
import { CELEBRATION_NAME_BOTTOM } from './geometry';
import { getLayout } from './layout';

describe('layout', () => {
  it('returns the composition dimensions for every format', () => {
    for (const format of AD_FORMATS) {
      expect(getLayout(format).width).toBe(FORMAT_SIZES[format].width);
      expect(getLayout(format).height).toBe(FORMAT_SIZES[format].height);
    }
  });

  it('makes the Reel phone almost full width, as George asked', () => {
    const l = getLayout('reel');
    expect((PHONE_W * l.phoneScale) / l.width).toBeGreaterThan(0.85);
  });

  it('keeps every phone narrower than the frame at both its sizes', () => {
    for (const format of AD_FORMATS) {
      const l = getLayout(format);
      expect(PHONE_W * l.phoneScale).toBeLessThan(l.width);
      expect(PHONE_W * l.matchScale).toBeLessThan(l.width);
    }
  });

  it('shows the whole card, rank row included, in the Reel solo shot', () => {
    const l = getLayout('reel');
    expect(l.slots.solo + (CARD_Y + CARD_H) * l.phoneScale).toBeLessThan(l.height);
  });

  it('starts every phone fully below the frame', () => {
    for (const format of AD_FORMATS) {
      const l = getLayout(format);
      expect(l.slots.hidden).toBeGreaterThanOrEqual(l.height);
    }
  });

  it('stacks the partner phone below the first, overlapping it', () => {
    for (const format of AD_FORMATS) {
      const l = getLayout(format);
      expect(l.slots.bottom).toBeGreaterThan(l.slots.top);
      expect(l.slots.bottom).toBeLessThan(l.height);
    }
  });

  it('keeps the phones clear of the headline slot', () => {
    for (const format of AD_FORMATS) {
      const l = getLayout(format);
      const headlineBottom = l.headline.top + l.headline.fontSize * 1.15 * 2;
      expect(l.slots.top).toBeGreaterThan(headlineBottom);
      expect(l.slots.solo).toBeGreaterThan(headlineBottom);
    }
  });

  it('keeps the Reel phones full size through the match', () => {
    const l = getLayout('reel');
    expect(l.matchScale).toBe(l.phoneScale);
  });

  it('shows the matched name in both stacked phones, in every format', () => {
    // Feed and Square crop too hard at full size: "Esme" fell below the line.
    for (const format of AD_FORMATS) {
      const l = getLayout(format);
      const topVisible = (l.slots.bottom - l.slots.top) / l.matchScale;
      const bottomVisible = (l.height - l.slots.bottom) / l.matchScale;
      expect(topVisible).toBeGreaterThan(CELEBRATION_NAME_BOTTOM);
      expect(bottomVisible).toBeGreaterThan(CELEBRATION_NAME_BOTTOM);
    }
  });

  it('keeps the stacked phones inside the frame at their match size', () => {
    for (const format of AD_FORMATS) {
      const l = getLayout(format);
      expect(PHONE_W * l.matchScale).toBeLessThan(l.width);
    }
  });
});
