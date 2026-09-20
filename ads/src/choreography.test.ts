import { describe, expect, it } from 'vitest';
import { getPhoneState } from './choreography';

describe('choreography', () => {
  it('shows no phones during the opening card fan', () => {
    expect(getPhoneState({ frame: 30, side: 'left' }).visible).toBe(false);
    expect(getPhoneState({ frame: 30, side: 'right' }).visible).toBe(false);
  });

  it('brings the mint phone in alone before the partner arrives', () => {
    expect(getPhoneState({ frame: 75, side: 'left' }).visible).toBe(true);
    expect(getPhoneState({ frame: 75, side: 'right' }).visible).toBe(false);
  });

  it('enters the left phone on the phone-enter beat', () => {
    const state = getPhoneState({ frame: 62, side: 'left' });
    expect(state.pose).toBe('enter');
    expect(state.poseStartFrame).toBe(60);
  });

  it('brings the blue phone in on the partner-join beat', () => {
    expect(getPhoneState({ frame: 195, side: 'right' }).visible).toBe(true);
    expect(getPhoneState({ frame: 195, side: 'right' }).pose).toBe('enter');
  });

  it('holds both phones perfectly still through the stillness beat', () => {
    for (const side of ['left', 'right'] as const) {
      const state = getPhoneState({ frame: 315, side });
      expect(state.pose).toBe('idle');
      expect(state.swipe).toBe(0);
    }
  });

  it('shows the same name on both phones during the stillness', () => {
    const left = getPhoneState({ frame: 315, side: 'left' });
    const right = getPhoneState({ frame: 315, side: 'right' });
    expect(left.card?.name).toBe('Esme');
    expect(right.card?.name).toBe('Esme');
  });

  it('swipes both phones right together on the match-fuse beat', () => {
    const left = getPhoneState({ frame: 350, side: 'left' });
    const right = getPhoneState({ frame: 350, side: 'right' });
    expect(left.swipe).toBeGreaterThan(0);
    expect(right.swipe).toBeGreaterThan(0);
    expect(left.swipe).toBeCloseTo(right.swipe, 5);
  });

  it('disagrees on Wren during the out-of-sync beat', () => {
    // Blue keeps it, mint bins it. Opposite swipe signs on the same name.
    const frames = Array.from({ length: 90 }, (_, i) => 210 + i);
    const disagreement = frames.find((f) => {
      const left = getPhoneState({ frame: f, side: 'left' });
      const right = getPhoneState({ frame: f, side: 'right' });
      return (
        left.card?.name === 'Wren' &&
        right.card?.name === 'Wren' &&
        left.swipe < 0 &&
        right.swipe > 0
      );
    });
    expect(disagreement).toBeDefined();
  });

  it('brings both phones together after the fuse', () => {
    expect(getPhoneState({ frame: 375, side: 'left' }).pose).toBe('together');
    expect(getPhoneState({ frame: 375, side: 'right' }).pose).toBe('together');
  });
});
