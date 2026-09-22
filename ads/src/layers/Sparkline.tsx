import type React from 'react';
import { invertRanks, plotSeries, smoothPath } from '../curves';

/** components/swipe/mini-sparkline.tsx: 80×28, stroke 2, rounded caps. */
export const Sparkline: React.FC<{ ranks: readonly number[]; color: string }> = ({
  ranks,
  color,
}) => {
  const width = 80;
  const height = 28;
  const d = smoothPath(plotSeries(invertRanks(ranks), width, height, 1));
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <path d={d} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};
