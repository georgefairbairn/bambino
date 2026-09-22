import type React from 'react';
import { type CardVisuals } from '../card-visuals';
import { CARD_H, CARD_W, CARD_X, CARD_Y } from '../device';
import { GABARITO, SANS } from '../fonts';
import { type AdName, getOriginFlag, getTrend } from '../names';
import {
  AD_THEMES,
  type AdTheme,
  CARD,
  SWIPE_COLORS,
  SWIPE_GRADIENTS,
  TEXT,
  TREND_STYLE,
  UNDERLINE_COLORS,
} from '../theme';
import { GenderBadge } from './GenderBadge';
import { Icon } from './Icon';
import { Sparkline } from './Sparkline';

/** swipe-card.tsx getNameFontSize. */
const nameFontSize = (name: string): number => {
  if (name.length <= 8) return 56;
  if (name.length <= 11) return 46;
  if (name.length <= 14) return 42;
  return 32;
};

const statLabel: React.CSSProperties = {
  fontFamily: SANS,
  fontSize: 10,
  fontWeight: 700,
  color: TEXT.muted,
  textTransform: 'uppercase',
  letterSpacing: 0.8,
  marginBottom: 4,
};

const Stamp: React.FC<{ kind: 'like' | 'nope'; scale: number; rotate: number }> = ({
  kind,
  scale,
  rotate,
}) => {
  const color = kind === 'like' ? SWIPE_COLORS.like : SWIPE_COLORS.nope;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        margin: 20,
        padding: '8px 14px',
        border: `4px solid ${color}`,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.95)',
        transform: `scale(${scale}) rotate(${rotate}deg)`,
      }}
    >
      <Icon name={kind === 'like' ? 'heart' : 'heartDislike'} size={24} color={color} />
      <span style={{ fontFamily: SANS, fontSize: 28, fontWeight: 800, letterSpacing: 3, color }}>
        {kind === 'like' ? 'LIKE' : 'NOPE'}
      </span>
    </div>
  );
};

/**
 * components/swipe/swipe-card.tsx, rebuilt in points from its own stylesheet:
 * white card, radius 16, a 5pt theme-primary border that fades as it swipes,
 * content that fades out, a top-to-bottom colour flood, and a LIKE or NOPE
 * stamp with its heart icon.
 */
export const NameCard: React.FC<{
  name: AdName;
  theme: AdTheme;
  visuals: CardVisuals;
  /** Peek-card scale and offset, for the card waiting behind. */
  peek?: { scale: number; translateY: number };
}> = ({ name, theme, visuals: v, peek }) => {
  const colors = AD_THEMES[theme];
  const underline = UNDERLINE_COLORS[name.gender];
  const trend = getTrend(name.tenYearRanks);
  const transform = peek
    ? `translateY(${peek.translateY}px) scale(${peek.scale})`
    : `translate(${v.translateX}px, ${v.translateY}px) rotate(${v.rotate}deg)`;

  return (
    <div
      style={{
        position: 'absolute',
        left: CARD_X,
        top: CARD_Y,
        width: CARD_W,
        height: CARD_H,
        borderRadius: CARD.borderRadius,
        backgroundColor: CARD.backgroundColor,
        overflow: 'hidden',
        transform,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: v.likeGradientOpacity,
          background: `linear-gradient(180deg, ${SWIPE_GRADIENTS.like[0]}, ${SWIPE_GRADIENTS.like[1]})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: v.nopeGradientOpacity,
          background: `linear-gradient(180deg, ${SWIPE_GRADIENTS.nope[0]}, ${SWIPE_GRADIENTS.nope[1]})`,
        }}
      />

      {/* The border is part of the RN box, so content sits 5pt inside it. */}
      <div
        style={{
          position: 'absolute',
          inset: CARD.borderWidth,
          padding: '48px 24px 24px',
          display: 'flex',
          flexDirection: 'column',
          opacity: v.contentOpacity,
        }}
      >
        <div style={{ marginBottom: 12, display: 'flex' }}>
          <GenderBadge gender={name.gender} theme={theme} />
        </div>

        <div style={{ display: 'inline-flex', flexDirection: 'column', alignSelf: 'flex-start' }}>
          <span
            style={{
              fontFamily: GABARITO,
              fontWeight: 800,
              fontSize: nameFontSize(name.name),
              lineHeight: 1.15,
              color: CARD.nameColor,
              marginBottom: 12,
            }}
          >
            {name.name}
          </span>
          <div style={{ height: 6, borderRadius: 3, backgroundColor: underline, marginBottom: 12 }} />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <div style={{ borderRadius: 8, padding: '10px 16px', backgroundColor: colors.surfaceSubtle }}>
            <span style={{ fontFamily: SANS, fontSize: 17, fontWeight: 600, color: TEXT.primary }}>
              {getOriginFlag(name.origin)} {name.origin}
            </span>
          </div>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.surfaceSubtle,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="volumeHigh" size={20} color={TEXT.secondary} />
          </div>
        </div>

        {/* The app's meaning box is a clipped ScrollView, so text stops at a
            line boundary with no ellipsis. Five 26pt lines fit this card. */}
        <div style={{ borderRadius: 8, padding: 16, marginBottom: 16, backgroundColor: colors.surfaceSubtle }}>
          <div
            style={{
              maxHeight: 26 * 5,
              overflow: 'hidden',
              fontFamily: SANS,
              fontSize: 17,
              lineHeight: '26px',
              color: TEXT.primary,
            }}
          >
            {name.meaning}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
          <div
            style={{
              flex: 1,
              borderRadius: 10,
              padding: '10px 8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: colors.surfaceSubtle,
            }}
          >
            <span style={statLabel}>Rank</span>
            <span style={{ fontFamily: GABARITO, fontWeight: 800, fontSize: 17, color: TEXT.primary }}>
              #{name.rank}
            </span>
          </div>
          <div style={{ flex: 2, borderRadius: 10, padding: '10px 12px', backgroundColor: colors.surfaceSubtle }}>
            <span style={statLabel}>10 Year Trend</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <div style={{ flex: 1, height: 28 }}>
                <Sparkline ranks={name.tenYearRanks} color={underline} />
              </div>
              {trend && (
                <span style={{ fontSize: 16, fontWeight: 700, color: TREND_STYLE[trend].color }}>
                  {TREND_STYLE[trend].arrow}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: CARD.borderRadius,
          border: `${v.borderWidth}px solid ${colors.primary}`,
        }}
      />

      <div
        style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-start', opacity: v.likeOverlayOpacity }}
      >
        <Stamp kind="like" scale={v.likeStampScale} rotate={v.likeStampRotate} />
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'flex-start',
          opacity: v.nopeOverlayOpacity,
        }}
      >
        <Stamp kind="nope" scale={v.nopeStampScale} rotate={v.nopeStampRotate} />
      </div>
    </div>
  );
};
