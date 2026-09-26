import type React from 'react';
import { DEVICE_H, DEVICE_W } from '../device';
import { SHEET } from '../geometry';
import { GABARITO, SANS } from '../fonts';
import { type MatchedName, getPeak, getTier, getTrend } from '../names';
import { type Screen } from '../scene';
import { AD_THEMES, type AdTheme, TEXT, TREND_STYLE } from '../theme';
import { Icon } from './Icon';
import { PopularityChart } from './PopularityChart';

type Detail = Extract<Screen, { kind: 'detail' }>;

const tileLabel: React.CSSProperties = {
  fontFamily: SANS,
  fontSize: 9,
  fontWeight: 700,
  color: TEXT.muted,
  textTransform: 'uppercase',
  letterSpacing: 0.8,
};

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

/**
 * The popularity sheet a card's RANK / TREND row opens. Tier, peak, ranked
 * total and chart all come from the matched name, so a cast variant can't
 * show one name's rank beside another name's history.
 */
export const DetailSheet: React.FC<{
  screen: Detail;
  name: MatchedName;
  theme: AdTheme;
  progress: number;
}> = ({ screen, name, theme, progress }) => {
  const colors = AD_THEMES[theme];
  const peak = getPeak(name.history);
  const tier = getTier(name.rank);
  const trend = getTrend(name.tenYearRanks);
  const top = SHEET.top + (1 - progress) * DEVICE_H;

  return (
    <>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: `rgba(0,0,0,${0.35 * progress})` }} />
      <div
        style={{
          position: 'absolute',
          left: 0,
          top,
          width: DEVICE_W,
          height: DEVICE_H,
          backgroundColor: '#FFFFFF',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: (DEVICE_W - 40) / 2,
            top: 8,
            width: 40,
            height: 5,
            borderRadius: 3,
            backgroundColor: '#E5E7EB',
          }}
        />
        <div style={{ position: 'absolute', right: SHEET.paddingX, top: 22 }}>
          <Icon name="close" size={24} color={TEXT.secondary} />
        </div>

        <div
          style={{
            position: 'absolute',
            left: SHEET.paddingX,
            right: SHEET.paddingX,
            top: SHEET.contentTop - screen.scroll,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'stretch',
              gap: 16,
              padding: '16px 20px',
              borderRadius: 16,
              backgroundColor: colors.surfaceSubtle,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80 }}>
              <span style={{ ...tileLabel, marginBottom: 2 }}>Rank</span>
              <span style={{ fontFamily: GABARITO, fontWeight: 800, fontSize: 36, lineHeight: '40px', color: TEXT.primary }}>
                #{name.rank}
              </span>
            </div>
            <div style={{ width: 1, height: 48, alignSelf: 'center', backgroundColor: '#E0D8E8' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span
                style={{
                  padding: '5px 12px',
                  borderRadius: 12,
                  marginBottom: 4,
                  background: `linear-gradient(135deg, ${tier.gradient[0]}, ${tier.gradient[1]})`,
                  fontFamily: SANS,
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#FFFFFF',
                  letterSpacing: 0.3,
                  textTransform: 'uppercase',
                }}
              >
                {tier.label}
              </span>
              <span style={{ fontFamily: SANS, fontSize: 11, color: TEXT.secondary, textAlign: 'center' }}>
                Ranked {ordinal(name.rank)} out of {name.rankedOutOf.toLocaleString('en-US')} names
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, borderRadius: 10, padding: '10px 8px', textAlign: 'center', backgroundColor: colors.surfaceSubtle }}>
              <div style={tileLabel}>Peak Year</div>
              <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 700, color: TEXT.primary, marginTop: 3 }}>
                {peak[0]}{' '}
                <span style={{ fontSize: 12, fontWeight: 500, color: TEXT.secondary }}>(#{peak[1]})</span>
              </div>
            </div>
            <div style={{ flex: 1, borderRadius: 10, padding: '10px 8px', textAlign: 'center', backgroundColor: colors.surfaceSubtle }}>
              <div style={tileLabel}>5 Year Trend</div>
              {trend && (
                <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 700, color: TREND_STYLE[trend].color, marginTop: 3 }}>
                  {trend === 'rising' ? 'Rising' : trend === 'falling' ? 'Falling' : 'Steady'} {TREND_STYLE[trend].arrow}
                </div>
              )}
            </div>
          </div>

          <PopularityChart
            series={name.history}
            gender={name.gender}
            theme={theme}
            progress={screen.chart}
          />
        </div>
      </div>
    </>
  );
};
