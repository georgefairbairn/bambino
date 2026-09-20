import type React from 'react';
import { useCurrentFrame } from 'remotion';
import { GABARITO } from '../fonts';
import { AD_THEMES, CARD, HEADLINE_COLOR } from '../theme';

export const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const t = Math.min(1, Math.max(0, (frame - 398) / 16));

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: '46%',
        textAlign: 'center',
        fontFamily: GABARITO,
        opacity: t,
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 84, color: HEADLINE_COLOR, marginBottom: 16 }}>
        Bambino
      </div>
      <div style={{ fontWeight: 400, fontSize: 34, color: CARD.nameColor, opacity: 0.75 }}>
        Free on the App Store
      </div>
      <div
        style={{
          margin: '32px auto 0',
          width: 180,
          height: 8,
          borderRadius: 4,
          background: `linear-gradient(90deg, ${AD_THEMES.mint.primary}, ${AD_THEMES.blue.primary})`,
        }}
      />
    </div>
  );
};
