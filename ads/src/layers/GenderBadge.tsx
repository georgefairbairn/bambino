import type React from 'react';
import { SANS } from '../fonts';
import { type Gender } from '../names';
import { AD_THEMES, type AdTheme, GENDER_BADGES } from '../theme';

/** components/name-detail/gender-badge.tsx at size="large". */
export const GenderBadge: React.FC<{ gender: Gender; theme: AdTheme }> = ({ gender, theme }) => {
  const config = GENDER_BADGES[gender];
  const bg = config.bg ?? AD_THEMES[theme].secondaryLight;
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 8,
        padding: '8px 16px',
        borderRadius: 16,
        backgroundColor: bg,
      }}
    >
      <span style={{ fontSize: 20, lineHeight: 1 }}>{config.emoji}</span>
      <span style={{ fontFamily: SANS, fontSize: 16, fontWeight: 600, color: config.text }}>
        {config.label}
      </span>
    </div>
  );
};
