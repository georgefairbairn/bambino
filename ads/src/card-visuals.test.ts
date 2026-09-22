import { describe, expect, it } from 'vitest';
import { EXIT_X, MAX_ROTATION, SWIPE_THRESHOLD } from './device';
import { getCardVisuals, getPeekVisuals, getSwipeX, interpolate } from './card-visuals';

describe('interpolate', () => {
  it('maps linearly between stops and clamps outside them', () => {
    expect(interpolate(5, [0, 10], [0, 100])).toBe(50);
    expect(interpolate(-5, [0, 10], [0, 100])).toBe(0);
    expect(interpolate(50, [0, 10], [0, 100])).toBe(100);
    expect(interpolate(15, [0, 10, 20], [0, 1, 0])).toBe(0.5);
  });
});

describe('getCardVisuals — mirrors swipe-card.tsx', () => {
  it('is untouched at rest', () => {
    const v = getCardVisuals(0);
    expect(v.rotate).toBe(0);
    expect(v.borderWidth).toBe(5);
    expect(v.contentOpacity).toBe(1);
    expect(v.likeOverlayOpacity).toBe(0);
    expect(v.nopeOverlayOpacity).toBe(0);
  });

  it('tilts a right swipe anticlockwise, as use-card-animation does', () => {
    expect(getCardVisuals(100).rotate).toBeCloseTo(-6, 5);
    expect(getCardVisuals(-100).rotate).toBeCloseTo(6, 5);
    expect(getCardVisuals(EXIT_X).rotate).toBe(-MAX_ROTATION);
  });

  it('fades the border and content out by half the threshold', () => {
    const half = getCardVisuals(SWIPE_THRESHOLD / 2);
    expect(half.borderWidth).toBe(0);
    expect(half.contentOpacity).toBe(0);
    const quarter = getCardVisuals(SWIPE_THRESHOLD / 4);
    expect(quarter.borderWidth).toBeCloseTo(2.5, 5);
    expect(quarter.contentOpacity).toBeCloseTo(0.5, 5);
  });

  it('floods the like gradient in as the card travels right', () => {
    expect(getCardVisuals(SWIPE_THRESHOLD * 0.3).likeGradientOpacity).toBeCloseTo(0.5, 5);
    expect(getCardVisuals(SWIPE_THRESHOLD).likeGradientOpacity).toBe(1);
    expect(getCardVisuals(SWIPE_THRESHOLD).nopeGradientOpacity).toBe(0);
  });

  it('shows the stamp early, fully legible at a quarter of the threshold', () => {
    expect(getCardVisuals(SWIPE_THRESHOLD * 0.1).likeOverlayOpacity).toBeCloseTo(0.5, 5);
    expect(getCardVisuals(SWIPE_THRESHOLD * 0.25).likeOverlayOpacity).toBe(1);
  });

  it('bounces the stamp with an overshoot and settles at full size', () => {
    expect(getCardVisuals(0).likeStampScale).toBeCloseTo(0.6, 5);
    expect(getCardVisuals(SWIPE_THRESHOLD * 0.5).likeStampScale).toBeCloseTo(1.2, 5);
    expect(getCardVisuals(SWIPE_THRESHOLD * 0.7).likeStampScale).toBe(1);
  });

  it('mirrors every value for a reject', () => {
    const like = getCardVisuals(80);
    const nope = getCardVisuals(-80);
    expect(nope.nopeGradientOpacity).toBeCloseTo(like.likeGradientOpacity, 5);
    expect(nope.nopeOverlayOpacity).toBeCloseTo(like.likeOverlayOpacity, 5);
    expect(nope.nopeStampRotate).toBeCloseTo(-like.likeStampRotate, 5);
    expect(nope.likeOverlayOpacity).toBe(0);
  });

  it('drops the card 60pt by the time it leaves, from EXIT_Y * -0.3', () => {
    expect(getCardVisuals(0).translateY).toBe(0);
    expect(getCardVisuals(EXIT_X).translateY).toBeCloseTo(60, 5);
  });
});

describe('getPeekVisuals', () => {
  it('sits behind at the app PEEK_CARD offset and comes forward as the top card leaves', () => {
    expect(getPeekVisuals(0)).toEqual({ scale: 0.95, translateY: 8 });
    expect(getPeekVisuals(EXIT_X)).toEqual({ scale: 1, translateY: 0 });
    expect(getPeekVisuals(-EXIT_X)).toEqual({ scale: 1, translateY: 0 });
  });
});

describe('getSwipeX', () => {
  it('starts at rest and finishes fully off screen in the swipe direction', () => {
    expect(getSwipeX(0, 1)).toBe(0);
    expect(getSwipeX(1, 1)).toBe(EXIT_X);
    expect(getSwipeX(1, -1)).toBe(-EXIT_X);
  });

  it('never moves backwards during a swipe', () => {
    let last = 0;
    for (let t = 0; t <= 1; t += 0.05) {
      const x = getSwipeX(t, 1);
      expect(x).toBeGreaterThanOrEqual(last);
      last = x;
    }
  });
});
