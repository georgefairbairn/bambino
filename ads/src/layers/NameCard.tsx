import type React from 'react';
import { GABARITO } from '../fonts';
import { type AdName } from '../names';
import { getCardTransform } from '../motion';
import { CARD, GENDER_BADGES, UNDERLINE_COLORS } from '../theme';
import { Stamp } from './Stamp';

/**
 * Rebuilt from the tokens in components/swipe/swipe-card.tsx. Deliberately
 * NOT importing that component: it is a React Native component and depends on
 * Reanimated, contexts and the theme module.
 *
 * The ad card drops the meaning paragraph and the popularity sparkline. At ad
 * scale and ad pace neither is readable, and the name is the only thing that
 * has to land.
 */
export const NameCard: React.FC<{ name: AdName; swipe: number }> = ({ name, swipe }) => {
  const t = getCardTransform(swipe);
  const badge = GENDER_BADGES[name.gender];

  return (
    <div
      style={{
        position: 'absolute',
        left: '6%',
        right: '6%',
        top: '12%',
        height: '46%',
        transform: `translateX(${t.translateX}px) rotate(${t.rotateZ}deg)`,
        borderRadius: CARD.borderRadius,
        backgroundColor: CARD.backgroundColor,
        boxShadow: `0 4px 12px ${CARD.shadowColor}26`,
        padding: `${CARD.paddingTop}px ${CARD.paddingHorizontal}px`,
        boxSizing: 'border-box',
        fontFamily: GABARITO,
      }}
    >
      <div
        style={{
          display: 'inline-block',
          padding: '8px 16px',
          borderRadius: 999,
          backgroundColor: badge.bg,
          color: badge.text,
          fontSize: 20,
          fontWeight: 800,
          marginBottom: 12,
        }}
      >
        {badge.label}
      </div>

      <div
        style={{
          fontSize: CARD.nameFontSize,
          fontWeight: 800,
          color: CARD.nameColor,
          marginBottom: 12,
          lineHeight: 1,
        }}
      >
        {name.name}
      </div>

      <div
        style={{
          height: CARD.underlineHeight,
          width: '52%',
          borderRadius: CARD.underlineHeight / 2,
          backgroundColor: UNDERLINE_COLORS[name.gender],
          marginBottom: 20,
        }}
      />

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            backgroundColor: '#F1F5F9',
            color: CARD.nameColor,
            fontSize: 20,
          }}
        >
          {name.origin}
        </span>
        <span style={{ color: '#94A3B8', fontSize: 18, letterSpacing: 1 }}>
          RANK #{name.rank}
        </span>
      </div>

      <Stamp kind="like" opacity={t.likeOpacity} />
      <Stamp kind="nope" opacity={t.nopeOpacity} />
    </div>
  );
};
