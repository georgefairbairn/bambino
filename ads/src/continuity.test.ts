import { describe, expect, it } from 'vitest';
import { DURATION_IN_FRAMES, FPS } from './compositions';
import { getPhoneState } from './choreography';
import { getPhoneTransform, type Side } from './motion';

/**
 * Beat changes reset a phone's pose and poseStartFrame. Nothing guarantees
 * the new pose starts where the old one stopped, so a boundary can snap.
 * These tests walk every frame and measure the jump, which is the one class
 * of defect that a still cannot show and a human has to catch by eye.
 */
const walk = (side: Side) => {
  const frames = [];
  for (let frame = 0; frame < DURATION_IN_FRAMES; frame++) {
    const state = getPhoneState({ frame, side });
    frames.push({
      frame,
      visible: state.visible,
      key: `${state.pose}@${state.poseStartFrame}:${state.leaning}`,
      phone: getPhoneTransform({
        pose: state.pose,
        localFrame: frame - state.poseStartFrame,
        fps: FPS,
        side,
        leaning: state.leaning,
      }),
    });
  }
  return frames;
};

describe('motion continuity', () => {
  /**
   * Only transitions are checked. Inside a single pose the easing guarantees
   * smoothness, and `enter` deliberately travels 1200px in under a second,
   * so a blanket per-frame cap would flag the entrance as a defect.
   */
  const transitions = (side: Side) => {
    const frames = walk(side);
    const out = [];
    for (let i = 1; i < frames.length; i++) {
      const a = frames[i - 1]!;
      const b = frames[i]!;
      // A phone appearing or disappearing is a cut, not a snap.
      if (!a.visible || !b.visible) continue;
      if (a.key === b.key) continue;
      out.push({
        frame: b.frame,
        from: a.key,
        to: b.key,
        dx: Math.abs(b.phone.translateX - a.phone.translateX),
        dy: Math.abs(b.phone.rotateY - a.phone.rotateY),
        dz: Math.abs(b.phone.rotateZ - a.phone.rotateZ),
      });
    }
    return out;
  };

  it.each(['left', 'right'] as const)(
    'does not shift the %s phone when its pose changes',
    (side) => {
      expect(transitions(side).filter((t) => t.dx > 6)).toEqual([]);
    },
  );

  it.each(['left', 'right'] as const)(
    'does not spin the %s phone when its pose changes',
    (side) => {
      expect(transitions(side).filter((t) => t.dy > 3 || t.dz > 3)).toEqual([]);
    },
  );

  it('actually exercises pose transitions, so the checks above are not vacuous', () => {
    expect(transitions('left').length).toBeGreaterThan(3);
    expect(transitions('right').length).toBeGreaterThan(3);
  });

  it('holds the card at rest through every frame of the stillness beat', () => {
    for (let frame = 300; frame < 330; frame++) {
      for (const side of ['left', 'right'] as const) {
        expect(getPhoneState({ frame, side }).swipe).toBe(0);
      }
    }
  });
});
