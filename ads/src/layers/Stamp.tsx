import type React from 'react';
import { GABARITO } from '../fonts';
import { SWIPE_COLORS } from '../theme';

/** Reproduces likeStamp / dislikeStamp from components/swipe/swipe-card.tsx. */
export const Stamp: React.FC<{ kind: 'like' | 'nope'; opacity: number }> = ({
  kind,
  opacity,
}) => {
  const color = kind === 'like' ? SWIPE_COLORS.like : SWIPE_COLORS.nope;
  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        [kind === 'like' ? 'left' : 'right']: 24,
        opacity,
        padding: '8px 14px',
        border: `4px solid ${color}`,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        transform: `rotate(${kind === 'like' ? -12 : 12}deg)`,
        fontFamily: GABARITO,
        fontWeight: 800,
        fontSize: 28,
        letterSpacing: 3,
        color,
      }}
    >
      {kind === 'like' ? 'LIKE' : 'NOPE'}
    </div>
  );
};
