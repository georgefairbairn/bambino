import type React from 'react';
import { AbsoluteFill } from 'remotion';
import { ALFA_SLAB_ONE, GABARITO, POPPINS, SANS } from '../fonts';
import { Backdrop } from '../layers/Backdrop';
import { AD_THEMES, CARD, HEADLINE_COLOR, TEXT, UNDERLINE_COLORS } from '../theme';
import { LISTS, type ListId } from './data';

/** Row height in px. Ten rows fill the card without crowding the footer. */
const ROW_H = 84;

/**
 * A top-ten name list on a white card, each name set like the app's swipe
 * card: Gabarito over a gender underline, with the figure on the right.
 */
export const ListPost: React.FC<{ list: ListId }> = ({ list }) => {
  const { title, subtitle, rows } = LISTS[list];

  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill
        style={{
          flexDirection: 'column',
          alignItems: 'center',
          padding: '64px 60px 44px',
        }}
      >
        <div
          style={{
            fontFamily: POPPINS,
            fontWeight: 600,
            fontSize: 64,
            lineHeight: 1.12,
            letterSpacing: -1,
            color: HEADLINE_COLOR,
            textAlign: 'center',
            textWrap: 'balance',
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: 14,
            fontFamily: SANS,
            fontWeight: 500,
            fontSize: 30,
            color: TEXT.secondary,
          }}
        >
          {subtitle}
        </div>
        <div
          style={{
            marginTop: 36,
            width: '100%',
            padding: '14px 36px',
            boxSizing: 'border-box',
            backgroundColor: CARD.backgroundColor,
            borderRadius: 32,
            boxShadow: '0 24px 48px rgba(45,27,78,0.10), 0 6px 14px rgba(45,27,78,0.06)',
          }}
        >
          {rows.map((row, i) => (
            <div
              key={row.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                height: ROW_H,
                borderTop: i === 0 ? 'none' : '1.5px solid #F1ECF6',
              }}
            >
              <div
                style={{
                  width: 52,
                  fontFamily: SANS,
                  fontWeight: 600,
                  fontSize: 26,
                  color: TEXT.muted,
                }}
              >
                {i + 1}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span style={{ position: 'relative', alignSelf: 'flex-start' }}>
                  <span
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      fontFamily: GABARITO,
                      fontWeight: 800,
                      fontSize: 44,
                      lineHeight: 1.05,
                      color: CARD.nameColor,
                    }}
                  >
                    {row.name}
                  </span>
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: 2,
                      height: CARD.underlineHeight,
                      borderRadius: 3,
                      backgroundColor: UNDERLINE_COLORS[row.gender],
                    }}
                  />
                </span>
                <span
                  style={{
                    marginTop: 4,
                    fontFamily: SANS,
                    fontWeight: 500,
                    fontSize: 22,
                    color: TEXT.secondary,
                  }}
                >
                  {row.note}
                </span>
              </div>
              <div
                style={{
                  fontFamily: POPPINS,
                  fontWeight: 600,
                  fontSize: 36,
                  color: HEADLINE_COLOR,
                }}
              >
                {row.stat}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 'auto',
            fontFamily: ALFA_SLAB_ONE,
            fontSize: 48,
            lineHeight: 1,
            color: AD_THEMES.mint.primary,
          }}
        >
          bambino
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
