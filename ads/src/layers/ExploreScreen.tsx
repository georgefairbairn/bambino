import type React from 'react';
import { getCardVisuals, getPeekVisuals } from '../card-visuals';
import { FILTERS_PILL } from '../geometry';
import { SANS } from '../fonts';
import { type Screen } from '../scene';
import { AD_THEMES, type AdTheme, TEXT } from '../theme';
import { Icon } from './Icon';
import { MatchCelebration } from './MatchCelebration';
import { NameCard } from './NameCard';

type Explore = Extract<Screen, { kind: 'explore' }>;

const pill: React.CSSProperties = {
  position: 'absolute',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  backgroundColor: '#FFFFFF',
  padding: '8px 12px',
  borderRadius: 16,
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  boxSizing: 'border-box',
};

/** The Explore tab: header pills and the swipe card stack. */
export const ExploreScreen: React.FC<{ screen: Explore; theme: AdTheme }> = ({ screen, theme }) => {
  const colors = AD_THEMES[theme];
  const front = screen.front;
  const rest = getCardVisuals(0);

  return (
    <>
      <div
        style={{
          ...pill,
          left: FILTERS_PILL.x,
          top: FILTERS_PILL.y,
          width: FILTERS_PILL.w,
          height: FILTERS_PILL.h,
        }}
      >
        <Icon name="optionsOutline" size={16} color={TEXT.primary} />
        <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: TEXT.primary }}>Filters</span>
      </div>
      <div style={{ ...pill, right: 16, top: FILTERS_PILL.y, height: FILTERS_PILL.h }}>
        <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: TEXT.secondary }}>
          {screen.likedCount}
        </span>
        <Icon name="heart" size={16} color={colors.primary} />
      </div>

      {screen.back && (
        <NameCard name={screen.back} theme={theme} visuals={rest} peek={getPeekVisuals(front?.x ?? 0)} />
      )}
      {front && <NameCard name={front.name} theme={theme} visuals={getCardVisuals(front.x)} />}
      <MatchCelebration name="Esme" theme={theme} progress={screen.celebration} />
    </>
  );
};
