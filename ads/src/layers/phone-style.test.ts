import { describe, expect, it } from 'vitest';
import { toCssTransform } from './phone-style';

describe('toCssTransform', () => {
  it('emits an identity transform for a neutral pose', () => {
    const css = toCssTransform({
      translateX: 0,
      translateY: 0,
      rotateY: 0,
      rotateZ: 0,
      scale: 1,
    });
    expect(css).toBe('translate3d(0px, 0px, 0) rotateY(0deg) rotateZ(0deg) scale(1)');
  });

  it('orders transforms so rotation happens about the phone, not the frame', () => {
    const css = toCssTransform({
      translateX: 30,
      translateY: -10,
      rotateY: 10,
      rotateZ: 2,
      scale: 0.8,
    });
    expect(css.indexOf('translate3d')).toBeLessThan(css.indexOf('rotateY'));
    expect(css.indexOf('rotateY')).toBeLessThan(css.indexOf('rotateZ'));
    expect(css.indexOf('rotateZ')).toBeLessThan(css.indexOf('scale'));
  });

  it('rounds to three decimals so frames are byte-identical across renders', () => {
    const css = toCssTransform({
      translateX: 1 / 3,
      translateY: 0,
      rotateY: 0,
      rotateZ: 0,
      scale: 1,
    });
    expect(css).toContain('0.333px');
  });
});
