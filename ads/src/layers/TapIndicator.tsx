import type React from 'react';
import { type Tap } from '../scene';

/** A soft touch marker, drawn in the phone's screen points. */
export const TapIndicator: React.FC<{ tap: Tap }> = ({ tap }) => {
  const p = tap.progress;
  const opacity = p < 0.25 ? p / 0.25 : 1 - (p - 0.25) / 0.75;
  const scale = 0.7 + 0.5 * p;
  return (
    <div
      style={{
        position: 'absolute',
        left: tap.x - 22,
        top: tap.y - 22,
        width: 44,
        height: 44,
        borderRadius: 22,
        // The grey dot iOS screen recordings use for touches: visible on the
        // pale mint UI, where a white ring disappeared.
        backgroundColor: 'rgba(45,27,78,0.28)',
        border: '2px solid rgba(255,255,255,0.9)',
        boxShadow: '0 2px 10px rgba(45,27,78,0.25)',
        opacity: Math.max(0, opacity),
        transform: `scale(${scale})`,
        zIndex: 50,
      }}
    />
  );
};
