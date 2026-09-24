import type React from 'react';
import { AbsoluteFill } from 'remotion';
import { ALFA_SLAB_ONE, POPPINS } from '../fonts';
import { Backdrop } from '../layers/Backdrop';
import { AD_THEMES, HEADLINE_COLOR, UNDERLINE_COLORS } from '../theme';

/**
 * The profile's introduction: the wordmark in the sign-in screen's face and
 * colour, over the promise, with the ad hook's pink underline under the payoff.
 */
export const BrandPost: React.FC = () => (
  <AbsoluteFill>
    <Backdrop />
    <AbsoluteFill
      style={{ alignItems: 'center', justifyContent: 'center', gap: 56, paddingBottom: 40 }}
    >
      <div
        style={{
          fontFamily: ALFA_SLAB_ONE,
          fontSize: 176,
          lineHeight: 1,
          color: AD_THEMES.mint.primary,
        }}
      >
        bambino
      </div>
      <div
        style={{
          fontFamily: POPPINS,
          fontWeight: 600,
          fontSize: 76,
          lineHeight: 1.15,
          letterSpacing: -1,
          color: HEADLINE_COLOR,
          textAlign: 'center',
          // Keeps the underline's negative z-index inside this block, above the backdrop.
          isolation: 'isolate',
        }}
      >
        Pick a baby name
        <br />
        <span style={{ position: 'relative', display: 'inline-block' }}>
          you both love
          <span
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 4,
              height: 9,
              borderRadius: 5,
              backgroundColor: UNDERLINE_COLORS.female,
              zIndex: -1,
            }}
          />
        </span>
      </div>
    </AbsoluteFill>
  </AbsoluteFill>
);
