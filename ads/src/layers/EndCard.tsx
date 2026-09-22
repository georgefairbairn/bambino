import type React from 'react';
import { ALFA_SLAB_ONE, POPPINS } from '../fonts';
import { AD_THEMES, HEADLINE_COLOR, ICON_BG } from '../theme';

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/**
 * App icon, the lowercase Alfa Slab One wordmark in the mint primary (as the
 * app's sign-in screen draws it), and where to get it. The icon is drawn from
 * the same font rather than shipped as a PNG.
 */
export const EndCard: React.FC<{ progress: number; scale: number }> = ({ progress, scale }) => {
  const icon = clamp01(progress / 0.5);
  const word = clamp01((progress - 0.2) / 0.5);
  const tag = clamp01((progress - 0.45) / 0.55);
  const pop = icon < 0.7 ? 0.6 + (icon / 0.7) * 0.5 : 1.1 - ((icon - 0.7) / 0.3) * 0.1;
  const mint = AD_THEMES.mint.primary;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 220 * scale,
          height: 220 * scale,
          borderRadius: 50 * scale,
          backgroundColor: ICON_BG,
          boxShadow: '0 18px 40px rgba(5,150,105,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: icon,
          transform: `scale(${pop})`,
        }}
      >
        <span style={{ fontFamily: ALFA_SLAB_ONE, fontSize: 170 * scale, lineHeight: 1, color: mint, marginTop: -14 * scale }}>
          b
        </span>
      </div>
      <div
        style={{
          marginTop: 44 * scale,
          fontFamily: ALFA_SLAB_ONE,
          fontSize: 132 * scale,
          lineHeight: 1,
          color: mint,
          opacity: word,
          transform: `translateY(${(1 - word) * 30}px)`,
        }}
      >
        bambino
      </div>
      <div
        style={{
          marginTop: 34 * scale,
          fontFamily: POPPINS,
          fontWeight: 600,
          fontSize: 50 * scale,
          color: HEADLINE_COLOR,
          opacity: tag,
          transform: `translateY(${(1 - tag) * 20}px)`,
        }}
      >
        Free on the App Store
      </div>
    </div>
  );
};
