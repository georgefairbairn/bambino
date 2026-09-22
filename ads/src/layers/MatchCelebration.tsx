import type React from 'react';
import { CARD_H, CARD_W, CARD_X, CARD_Y } from '../device';
import { GABARITO, SANS } from '../fonts';
import { AD_THEMES, type AdTheme, TEXT } from '../theme';

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/**
 * components/matches/match-celebration-modal.tsx: a card-sized panel over the
 * swipe card, with the "It's a Match!" banner, the name, the line of copy and
 * the two buttons, all in the app's own styles and words.
 *
 * One deliberate difference: the app centres this content vertically in a
 * 626pt card. The ad's phones are cropped, so the content starts near the top
 * of the card instead; centred, the banner fell below the crop line.
 */
export const MatchCelebration: React.FC<{ name: string; theme: AdTheme; progress: number }> = ({
  name,
  theme,
  progress,
}) => {
  if (progress <= 0) return null;
  const colors = AD_THEMES[theme];
  const card = clamp01(progress / 0.35);
  const banner = clamp01((progress - 0.15) / 0.35);
  const title = clamp01((progress - 0.35) / 0.35);
  const rest = clamp01((progress - 0.55) / 0.45);
  const bannerScale = banner < 0.7 ? 0.5 + (banner / 0.7) * 0.65 : 1.15 - ((banner - 0.7) / 0.3) * 0.15;

  return (
    <div
      style={{
        position: 'absolute',
        left: CARD_X,
        top: CARD_Y,
        width: CARD_W,
        height: CARD_H,
        borderRadius: 16,
        border: `5px solid ${colors.primary}`,
        backgroundColor: '#FFFFFF',
        boxSizing: 'border-box',
        overflow: 'hidden',
        opacity: card,
        transform: `scale(${0.92 + 0.08 * card})`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '44px 24px 0',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderRadius: 16,
          border: `3px solid ${colors.primary}`,
          backgroundColor: colors.secondaryLight,
          padding: '12px 24px',
          boxShadow: '0 6px 24px rgba(255,92,138,0.25)',
          opacity: banner,
          transform: `scale(${bannerScale})`,
        }}
      >
        <span style={{ fontFamily: GABARITO, fontWeight: 800, fontSize: 20, color: colors.tabActive }}>
          {"It's a Match!"}
        </span>
      </div>
      <div
        style={{
          fontFamily: GABARITO,
          fontWeight: 800,
          fontSize: 46,
          color: TEXT.primary,
          textAlign: 'center',
          marginTop: 20,
          marginBottom: 12,
          opacity: title,
          transform: `translateY(${(1 - title) * 20}px)`,
        }}
      >
        {name}
      </div>
      <div
        style={{
          fontFamily: SANS,
          fontSize: 14,
          lineHeight: '21px',
          color: TEXT.secondary,
          textAlign: 'center',
          marginBottom: 28,
          opacity: rest,
        }}
      >
        {"You and your partner both love this name — it's on your shortlist!"}
      </div>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12, opacity: rest }}>
        <div
          style={{
            textAlign: 'center',
            padding: '16px 0',
            borderRadius: 12,
            backgroundColor: colors.primary,
            fontFamily: SANS,
            fontSize: 16,
            fontWeight: 600,
            color: '#FFFFFF',
          }}
        >
          View Matches
        </div>
        <div
          style={{
            textAlign: 'center',
            padding: '14px 0',
            borderRadius: 12,
            border: `2px solid ${colors.primary}`,
            fontFamily: SANS,
            fontSize: 16,
            fontWeight: 600,
            color: colors.primary,
          }}
        >
          Keep Swiping
        </div>
      </div>
    </div>
  );
};
