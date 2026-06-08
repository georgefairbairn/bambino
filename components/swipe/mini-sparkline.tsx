import Svg, { Path } from 'react-native-svg';

interface MiniSparklineProps {
  /** Series to plot left→right; higher value = higher on screen. */
  points: number[];
  width?: number;
  height?: number;
  color: string;
  strokeWidth?: number;
}

/**
 * Lightweight sparkline — a single SVG <Path> — replacing the per-card
 * react-native-gifted-charts LineChart on the swipe card (#214). The full
 * PopularityChart still uses gifted-charts; this is just the 80×28 spark.
 *
 * Uses a Catmull-Rom → cubic Bézier smoothing to match gifted-charts' `curved`
 * line look.
 */
export function MiniSparkline({
  points,
  width = 80,
  height = 28,
  color,
  strokeWidth = 2,
}: MiniSparklineProps) {
  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  // Inset by half the stroke so the line isn't clipped at the top/bottom edges.
  const pad = strokeWidth / 2;
  const stepX = (width - pad * 2) / (points.length - 1);

  const coords = points.map((v, i) => ({
    x: pad + i * stepX,
    y: pad + (height - pad * 2) * (1 - (v - min) / range),
  }));

  const start = coords[0];
  if (!start) return null;

  let d = `M${start.x},${start.y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i];
    const p2 = coords[i + 1];
    if (!p1 || !p2) continue;
    const p0 = coords[i - 1] ?? p1;
    const p3 = coords[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  return (
    <Svg width={width} height={height}>
      <Path
        d={d}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
