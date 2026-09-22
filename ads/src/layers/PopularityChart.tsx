import type React from 'react';
import { plotSeries, smoothPath } from '../curves';
import { SANS } from '../fonts';
import { AD_THEMES, type AdTheme, TEXT, UNDERLINE_COLORS } from '../theme';

const PLOT_W = 250;
const PLOT_H = 180;
const Y_LABEL_W = 38;
const SPACING_X = 10;

/**
 * components/popularity/popularity-chart.tsx: curved area line in the gender
 * colour, four sections, rank on the Y axis with #N labels, five-ish year
 * labels, the 20 YEARS pill selected, and a tooltip line above. `progress`
 * sweeps the line in from the left.
 */
export const PopularityChart: React.FC<{
  series: readonly (readonly [number, number])[];
  theme: AdTheme;
  progress: number;
  tooltip: number;
}> = ({ series, theme, progress, tooltip }) => {
  const colors = AD_THEMES[theme];
  const line = UNDERLINE_COLORS.female;
  const ranks = series.map(([, r]) => r);
  const maxRank = Math.max(...ranks);
  const minRank = Math.min(...ranks);
  const values = ranks.map((r) => maxRank - r + 1);
  const pts = plotSeries(values, PLOT_W, PLOT_H, 0).map((p, i, a) => ({
    x: SPACING_X + (i * (PLOT_W - SPACING_X * 2)) / (a.length - 1),
    y: p.y,
  }));
  const d = smoothPath(pts);
  const area = `${d} L${pts[pts.length - 1]!.x},${PLOT_H} L${pts[0]!.x},${PLOT_H} Z`;
  const last = series[series.length - 1]!;

  const sections = 4;
  const yLabels = Array.from({ length: sections + 1 }, (_, i) => {
    const value = ((maxRank - minRank + 1) * i) / sections;
    return `#${Math.round(maxRank - value + 1).toLocaleString('en-US')}`;
  });
  const interval = Math.max(1, Math.floor((series.length - 1) / 4));
  const xLabels = series
    .map(([year], i) => ({ year, i }))
    .filter(({ i }) => i % interval === 0 || i === series.length - 1);

  return (
    <div
      style={{
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        backgroundColor: colors.surfaceSubtle,
      }}
    >
      <div
        style={{
          fontFamily: SANS,
          fontSize: 9,
          fontWeight: 700,
          color: TEXT.muted,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          textAlign: 'center',
        }}
      >
        Popularity Over Time
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        {['20 YEARS', '50 YEARS', 'ALL TIME'].map((label, i) => (
          <span
            key={label}
            style={{
              fontFamily: SANS,
              fontSize: 12,
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: 16,
              backgroundColor: i === 0 ? colors.primaryLight : 'transparent',
              color: i === 0 ? colors.primary : TEXT.secondary,
            }}
          >
            {label}
          </span>
        ))}
      </div>
      <div
        style={{
          height: 20,
          textAlign: 'center',
          fontFamily: SANS,
          fontSize: 14,
          fontWeight: 600,
          color: TEXT.primary,
          opacity: tooltip,
        }}
      >
        {last[0]}: #{last[1]}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
        <div
          style={{
            width: 16,
            height: PLOT_H,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              transform: 'rotate(-90deg)',
              fontFamily: SANS,
              fontSize: 10,
              fontWeight: 600,
              color: TEXT.muted,
            }}
          >
            Rank
          </span>
        </div>
        <div style={{ width: Y_LABEL_W, height: PLOT_H, position: 'relative' }}>
          {yLabels.map((label, i) => (
            <span
              key={label}
              style={{
                position: 'absolute',
                right: 4,
                top: PLOT_H - (PLOT_H * i) / sections - 6,
                fontFamily: SANS,
                fontSize: 10,
                color: TEXT.secondary,
              }}
            >
              {label}
            </span>
          ))}
        </div>
        <div style={{ position: 'relative' }}>
          <svg width={PLOT_W} height={PLOT_H + 22} style={{ display: 'block', overflow: 'visible' }}>
            <defs>
              <linearGradient id="popFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={line} stopOpacity={0.28} />
                <stop offset="1" stopColor={line} stopOpacity={0} />
              </linearGradient>
              <clipPath id="popReveal">
                <rect x={0} y={-10} width={PLOT_W * progress} height={PLOT_H + 20} />
              </clipPath>
            </defs>
            <line x1={0} x2={PLOT_W} y1={PLOT_H} y2={PLOT_H} stroke={colors.border} strokeWidth={1} />
            <g clipPath="url(#popReveal)">
              <path d={area} fill="url(#popFill)" />
              <path d={d} stroke={line} strokeWidth={2} fill="none" strokeLinecap="round" />
            </g>
            {xLabels.map(({ year, i }) => (
              <text
                key={year}
                x={pts[i]!.x}
                y={PLOT_H + 16}
                textAnchor="middle"
                fontFamily={SANS}
                fontSize={10}
                fill={TEXT.secondary}
              >
                {year}
              </text>
            ))}
          </svg>
        </div>
      </div>
      <div
        style={{ textAlign: 'center', fontFamily: SANS, fontSize: 10, fontWeight: 600, color: TEXT.muted, marginTop: -6 }}
      >
        Year
      </div>
    </div>
  );
};
