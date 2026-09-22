export interface Point {
  x: number;
  y: number;
}

/**
 * Plot a series left to right into a box, higher values drawn higher.
 * Mirrors components/swipe/mini-sparkline.tsx, including its half-stroke inset.
 */
export const plotSeries = (
  values: readonly number[],
  width: number,
  height: number,
  pad: number,
): Point[] => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = (width - pad * 2) / Math.max(1, values.length - 1);
  return values.map((v, i) => ({
    x: pad + i * stepX,
    y: pad + (height - pad * 2) * (1 - (v - min) / range),
  }));
};

/**
 * Catmull-Rom to cubic Bézier, the smoothing mini-sparkline.tsx uses to match
 * gifted-charts' `curved` line.
 */
export const smoothPath = (points: readonly Point[]): string => {
  const start = points[0];
  if (!start) return '';
  let d = `M${start.x},${start.y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p0 = points[i - 1] ?? p1;
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
};

/** Ranks invert for plotting: rank 1 is the top of the chart. */
export const invertRanks = (ranks: readonly number[]): number[] => {
  const max = Math.max(...ranks);
  return ranks.map((r) => max - r + 1);
};
