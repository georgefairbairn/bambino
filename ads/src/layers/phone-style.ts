import { type PhoneTransform } from '../motion';

const r = (n: number): string => `${Math.round(n * 1000) / 1000}`;

/**
 * Transform order matters. Translate first, then rotate, then scale, so the
 * phone rotates about its own centre rather than swinging about the frame.
 * Values are rounded so repeated renders produce identical frames.
 */
export const toCssTransform = (t: PhoneTransform): string =>
  [
    `translate3d(${r(t.translateX)}px, ${r(t.translateY)}px, 0)`,
    `rotateY(${r(t.rotateY)}deg)`,
    `rotateZ(${r(t.rotateZ)}deg)`,
    `scale(${r(t.scale)})`,
  ].join(' ');
