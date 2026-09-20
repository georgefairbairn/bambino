import type React from 'react';
import { useCurrentFrame } from 'remotion';
import { GABARITO } from '../fonts';
import { CARD, UNDERLINE_COLORS } from '../theme';

/**
 * Seven real names, fanned like a hand of cards.
 *
 * The angle and width are constrained by the frame: at 24deg and 340px the
 * outermost cards hung off both edges of a 1080 composition.
 *
 * Each card pivots about a point far below itself, which is what turns a
 * stack into a fan. Two numbers here are load-bearing:
 *
 * - The pivot sits 700% below the card. The arc radius that produces is what
 *   sets how far apart adjacent cards land. At 340% they were 80px apart and
 *   each card buried the name on the one behind it.
 * - Five cards, not twelve. A left-aligned name needs ~150px of clear edge
 *   before the next card covers it. Five cards across 36deg leaves 176px
 *   each; seven leaves 118px and clips every name to four letters.
 */
const FAN: { name: string; tint: keyof typeof UNDERLINE_COLORS }[] = [
  { name: 'Olivia', tint: 'female' },
  { name: 'Liam', tint: 'male' },
  { name: 'Esme', tint: 'female' },
  { name: 'Noah', tint: 'male' },
  { name: 'Wren', tint: 'neutral' },
];

const CARD_W = 310;
const CARD_H = 150;
const MAX_ANGLE = 18;
const FRAMES_PER_CARD = 9;
const DROP_FRAMES = 9;

export const CardFan: React.FC = () => {
  const frame = useCurrentFrame();
  const last = FAN.length - 1;

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {FAN.map((entry, i) => {
        const appearAt = i * FRAMES_PER_CARD;
        if (frame < appearAt) return null;

        const t = Math.min(1, (frame - appearAt) / DROP_FRAMES);
        const eased = 1 - Math.pow(1 - t, 3);
        const angle = -MAX_ANGLE + (MAX_ANGLE * 2 * i) / last;

        return (
          <div
            key={entry.name}
            style={{
              position: 'absolute',
              left: '50%',
              top: '40%',
              width: CARD_W,
              height: CARD_H,
              marginLeft: -CARD_W / 2,
              padding: '26px 30px',
              boxSizing: 'border-box',
              borderRadius: CARD.borderRadius,
              backgroundColor: CARD.backgroundColor,
              boxShadow: `0 10px 30px ${CARD.shadowColor}2E`,
              fontFamily: GABARITO,
              fontWeight: 800,
              fontSize: 42,
              color: CARD.nameColor,
              opacity: eased,
              // Pivot below the card so rotation fans rather than spins in place.
              transformOrigin: '50% 700%',
              transform: `translateY(${(1 - eased) * -140}px) rotate(${angle * eased}deg)`,
            }}
          >
            {entry.name}
            <div
              style={{
                marginTop: 14,
                height: CARD.underlineHeight,
                width: 96,
                borderRadius: CARD.underlineHeight / 2,
                backgroundColor: UNDERLINE_COLORS[entry.tint],
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
