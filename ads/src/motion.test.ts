import { describe, expect, it } from 'vitest';
import {
  EXIT_X,
  MAX_ROTATION,
  SWIPE_THRESHOLD,
  getCardTransform,
  getPhoneTransform,
  getVisibleWordCount,
} from './motion';

const FPS = 30;

describe('getPhoneTransform', () => {
  it('starts the enter pose below the frame and settles it', () => {
    const start = getPhoneTransform({ pose: 'enter', localFrame: 0, fps: FPS, side: 'left' });
    const end = getPhoneTransform({ pose: 'enter', localFrame: 29, fps: FPS, side: 'left' });
    expect(start.translateY).toBeGreaterThan(500);
    expect(Math.abs(end.translateY)).toBeLessThan(20);
  });

  it('keeps the idle pose nearly still but never frozen', () => {
    const t = getPhoneTransform({ pose: 'idle', localFrame: 15, fps: FPS, side: 'left' });
    expect(t.translateY).toBe(0);
    expect(Math.abs(t.rotateZ)).toBeLessThanOrEqual(2);
    expect(t.scale).toBe(1);
  });

  it('drifts the idle pose over time rather than sitting at one angle', () => {
    const a = getPhoneTransform({ pose: 'idle', localFrame: 0, fps: FPS, side: 'left' });
    const b = getPhoneTransform({ pose: 'idle', localFrame: 15, fps: FPS, side: 'left' });
    expect(a.rotateZ).not.toBe(b.rotateZ);
  });

  it('mirrors the lean pose between the two sides', () => {
    const left = getPhoneTransform({ pose: 'lean', localFrame: 20, fps: FPS, side: 'left' });
    const right = getPhoneTransform({ pose: 'lean', localFrame: 20, fps: FPS, side: 'right' });
    expect(left.rotateY).toBeCloseTo(-right.rotateY, 5);
    expect(left.translateX).toBeCloseTo(-right.translateX, 5);
  });

  it('leans both phones toward the centre of the frame', () => {
    const left = getPhoneTransform({ pose: 'lean', localFrame: 20, fps: FPS, side: 'left' });
    const right = getPhoneTransform({ pose: 'lean', localFrame: 20, fps: FPS, side: 'right' });
    expect(left.translateX).toBeGreaterThan(0);
    expect(right.translateX).toBeLessThan(0);
  });

  it('snaps the recoil pose away and brings it back', () => {
    const peak = getPhoneTransform({ pose: 'recoil', localFrame: 4, fps: FPS, side: 'left' });
    const settled = getPhoneTransform({ pose: 'recoil', localFrame: 25, fps: FPS, side: 'left' });
    expect(Math.abs(peak.rotateZ)).toBeGreaterThan(Math.abs(settled.rotateZ));
    expect(Math.abs(settled.rotateZ)).toBeLessThan(1);
  });

  it('pulls the together pose further in than the lean pose', () => {
    // 'together' ramps the amount BEYOND a lean already being held, and the
    // choreography only ever uses it with leaning set, so that is what is
    // compared here.
    const lean = getPhoneTransform({ pose: 'lean', localFrame: 29, fps: FPS, side: 'left' });
    const together = getPhoneTransform({
      pose: 'together',
      localFrame: 29,
      fps: FPS,
      side: 'left',
      leaning: true,
    });
    expect(together.translateX).toBeGreaterThan(lean.translateX);
    expect(Math.abs(together.rotateY)).toBeGreaterThan(Math.abs(lean.rotateY));
  });

  it('holds a lean through idle and recoil, not just the lean pose', () => {
    for (const pose of ['idle', 'recoil'] as const) {
      const square = getPhoneTransform({ pose, localFrame: 10, fps: FPS, side: 'left' });
      const leaning = getPhoneTransform({
        pose,
        localFrame: 10,
        fps: FPS,
        side: 'left',
        leaning: true,
      });
      expect(square.translateX).toBe(0);
      expect(leaning.translateX).toBeGreaterThan(0);
      expect(leaning.rotateY).toBeGreaterThan(0);
    }
  });
});

describe('getCardTransform', () => {
  it('is fully neutral at rest', () => {
    expect(getCardTransform(0)).toEqual({
      translateX: 0,
      rotateZ: 0,
      likeOpacity: 0,
      nopeOpacity: 0,
    });
  });

  it('carries the card off the right edge on a full like', () => {
    const t = getCardTransform(1);
    expect(t.translateX).toBe(EXIT_X);
    expect(t.likeOpacity).toBe(1);
    expect(t.nopeOpacity).toBe(0);
  });

  it('carries the card off the left edge on a full reject', () => {
    const t = getCardTransform(-1);
    expect(t.translateX).toBe(-EXIT_X);
    expect(t.nopeOpacity).toBe(1);
    expect(t.likeOpacity).toBe(0);
  });

  it('clamps rotation to the app MAX_ROTATION in both directions', () => {
    expect(getCardTransform(1).rotateZ).toBe(MAX_ROTATION);
    expect(getCardTransform(-1).rotateZ).toBe(-MAX_ROTATION);
  });

  it('reaches a full stamp exactly at the app SWIPE_THRESHOLD', () => {
    const atThreshold = getCardTransform(SWIPE_THRESHOLD / EXIT_X);
    expect(atThreshold.likeOpacity).toBeCloseTo(1, 5);
  });

  it('fades the stamp in proportionally below the threshold', () => {
    const half = getCardTransform(SWIPE_THRESHOLD / EXIT_X / 2);
    expect(half.likeOpacity).toBeCloseTo(0.5, 5);
  });
});

describe('getVisibleWordCount', () => {
  it('shows nothing before the reveal starts', () => {
    expect(getVisibleWordCount({ totalWords: 3, localFrame: -1, fps: FPS })).toBe(0);
  });

  it('shows the first word immediately', () => {
    expect(getVisibleWordCount({ totalWords: 3, localFrame: 0, fps: FPS })).toBe(1);
  });

  it('adds words over time', () => {
    const early = getVisibleWordCount({ totalWords: 6, localFrame: 5, fps: FPS });
    const later = getVisibleWordCount({ totalWords: 6, localFrame: 25, fps: FPS });
    expect(later).toBeGreaterThan(early);
  });

  it('never exceeds the word count', () => {
    expect(getVisibleWordCount({ totalWords: 3, localFrame: 900, fps: FPS })).toBe(3);
  });
});
