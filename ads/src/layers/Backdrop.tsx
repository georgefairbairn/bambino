import type React from 'react';
import { AbsoluteFill } from 'remotion';
import { BACKDROP } from '../theme';

/**
 * The App Store stills sit on a pale mint base with one large, slightly
 * deeper circle behind the headline. Both tones were sampled from the
 * published PNGs rather than guessed.
 */
export const Backdrop: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: BACKDROP.base }}>
    <div
      style={{
        position: 'absolute',
        top: '-18%',
        right: '-28%',
        width: '95%',
        aspectRatio: '1 / 1',
        borderRadius: '50%',
        backgroundColor: BACKDROP.circle,
      }}
    />
  </AbsoluteFill>
);
