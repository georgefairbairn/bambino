import type React from 'react';
import { useCurrentFrame } from 'remotion';
import { GABARITO } from '../fonts';
import { AD_THEMES, CARD } from '../theme';

/**
 * The two liked cards lift off both screens, meet in the centre and fuse.
 *
 * Spans the match-fuse AND together beats (frames 330 to 390). An earlier
 * version faded in over 18 frames starting at local 12, which reached full
 * opacity at frame 360 — exactly when the match-fuse beat ends and the
 * component unmounts. The payoff was never actually visible.
 */
export const MatchFuse: React.FC<{ name: string }> = ({ name }) => {
  const frame = useCurrentFrame();
  const local = frame - 330;
  if (local < 10) return null;

  const t = Math.min(1, (local - 10) / 14);

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '46%',
        width: 520,
        marginLeft: -260,
        padding: '40px 36px',
        borderRadius: CARD.borderRadius,
        background: `linear-gradient(120deg, ${AD_THEMES.mint.primaryLight}, ${AD_THEMES.blue.primaryLight})`,
        boxShadow: `0 24px 60px ${CARD.shadowColor}40`,
        fontFamily: GABARITO,
        fontWeight: 800,
        fontSize: 84,
        color: CARD.nameColor,
        textAlign: 'center',
        opacity: t,
        transform: `scale(${0.72 + 0.28 * t})`,
      }}
    >
      {name}
    </div>
  );
};
