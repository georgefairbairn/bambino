import { describe, expect, it } from 'vitest';
import { DURATION_IN_FRAMES } from './compositions';
import { BEATS, HEADLINES, getBeat, getHeadline } from './timeline';

describe('timeline', () => {
  it('runs contiguously with no gaps or overlaps', () => {
    let expectedStart = 0;
    for (const beat of BEATS) {
      expect(beat.from).toBe(expectedStart);
      expect(beat.durationInFrames).toBeGreaterThan(0);
      expectedStart = beat.from + beat.durationInFrames;
    }
  });

  it('covers the full composition exactly', () => {
    const last = BEATS[BEATS.length - 1]!;
    expect(last.from + last.durationInFrames).toBe(DURATION_IN_FRAMES);
  });

  it('opens on the card fan and closes on the end card', () => {
    expect(getBeat(0).id).toBe('card-fan');
    expect(getBeat(DURATION_IN_FRAMES - 1).id).toBe('end-card');
  });

  it('holds the stillness beat for a full second before the match', () => {
    const stillness = BEATS.find((b) => b.id === 'stillness')!;
    expect(stillness.from).toBe(300);
    expect(stillness.durationInFrames).toBe(30);
    expect(getBeat(315).id).toBe('stillness');
  });

  it('shows no headline during the stillness, the fuse or the together beat', () => {
    expect(getHeadline(310)).toBeNull();
    expect(getHeadline(340)).toBeNull();
    expect(getHeadline(370)).toBeNull();
  });

  it('uses the four approved headlines and nothing else', () => {
    expect(HEADLINES).toEqual([
      '13,000 baby names.',
      'You swipe.',
      'So does your partner.',
      'The names you both like become matches.',
    ]);
    const used = new Set(
      BEATS.map((b) => b.headlineIndex).filter((i): i is 0 | 1 | 2 | 3 => i !== null),
    );
    expect([...used].sort()).toEqual([0, 1, 2, 3]);
  });

  it('lets a variant swap the copy without touching the beat table', () => {
    const variant = ['A.', 'B.', 'C.', 'D.'];
    expect(getHeadline(0, variant)).toBe('A.');
    expect(getHeadline(400, variant)).toBe('D.');
    expect(getHeadline(310, variant)).toBeNull();
  });

  it('never claims a rounded-up name count', () => {
    for (const headline of HEADLINES) {
      expect(headline).not.toMatch(/30,?000/);
    }
  });

  it('clamps out-of-range frames to the first and last beat', () => {
    expect(getBeat(-5).id).toBe('card-fan');
    expect(getBeat(9999).id).toBe('end-card');
  });
});
