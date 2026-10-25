import type React from 'react';
import { DEVICE_H, DEVICE_W } from '../device';
import { SANS } from '../fonts';
import { AD_THEMES, type AdTheme, TEXT } from '../theme';
import { Icon, type IconName } from './Icon';

/** app/(tabs)/_layout.tsx: the four tabs, Explore selected. */
const TABS: readonly { label: string; icon: IconName }[] = [
  { label: 'Explore', icon: 'search' },
  { label: 'Shortlist', icon: 'bookmarkOutline' },
  { label: 'Matches', icon: 'peopleOutline' },
  { label: 'Settings', icon: 'settingsOutline' },
];

/** tabBarStyle in app/(tabs)/_layout.tsx. */
const TAB_BAR_H = 85;

/** The app's floating tab bar: rounded top, frosted white, Explore active. */
export const TabBar: React.FC<{ theme: AdTheme }> = ({ theme }) => {
  const colors = AD_THEMES[theme];

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: DEVICE_H - TAB_BAR_H,
        width: DEVICE_W,
        height: TAB_BAR_H,
        boxSizing: 'border-box',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        border: '1px solid rgba(255,255,255,0.5)',
        borderBottom: 0,
        backgroundColor: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)',
        boxShadow: `0 -4px 20px ${colors.secondary}1A`,
        display: 'flex',
        paddingTop: 7,
      }}
    >
      {TABS.map((tab, i) => {
        const color = i === 0 ? colors.tabActive : TEXT.secondary;
        return (
          <div
            key={tab.label}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}
          >
            <Icon name={tab.icon} size={24} color={color} />
            <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color }}>{tab.label}</span>
          </div>
        );
      })}
    </div>
  );
};
