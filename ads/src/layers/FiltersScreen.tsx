import type React from 'react';
import { DEVICE_H, DEVICE_W } from '../device';
import { CATEGORY_ROWS, CELEBRITY_INDEX, FILTERS, categoryRowY } from '../geometry';
import { GABARITO, SANS } from '../fonts';
import { type Screen } from '../scene';
import { AD_THEMES, type AdTheme, GENDER_BADGES, TEXT } from '../theme';
import { Icon } from './Icon';
import { Switch } from './Switch';

type Filters = Extract<Screen, { kind: 'filters' }>;

const row = (theme: AdTheme): React.CSSProperties => ({
  position: 'absolute',
  left: FILTERS.contentX,
  width: FILTERS.contentW,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: FILTERS.rowPadding,
  boxSizing: 'border-box',
  backgroundColor: '#FFF8FA',
  borderRadius: 16,
  boxShadow: `0 2px 8px ${AD_THEMES[theme].secondary}1A`,
});

/**
 * app/(tabs)/explore/filters.tsx, laid out absolutely from geometry.ts so the
 * scene's taps land on these exact switches.
 */
export const FiltersScreen: React.FC<{ screen: Filters; theme: AdTheme }> = ({ screen, theme }) => {
  const colors = AD_THEMES[theme];
  const selected = screen.allSwitch >= 0.5 ? null : screen.celebritySwitch >= 0.5 ? 1 : 0;
  const badgeText = selected === null ? 'All' : `${selected}`;

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: 16,
          top: FILTERS.header.y + 8,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: '#FFFFFF',
          boxShadow: `0 2px 4px ${colors.secondary}1A`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="arrowBack" size={22} color={TEXT.primary} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          width: DEVICE_W,
          top: FILTERS.header.y + 15,
          textAlign: 'center',
          fontFamily: GABARITO,
          fontWeight: 800,
          fontSize: 20,
          color: TEXT.primary,
        }}
      >
        Filters
      </div>

      <div
        style={{
          position: 'absolute',
          left: FILTERS.contentX,
          width: FILTERS.contentW,
          top: FILTERS.counter.y,
          height: FILTERS.counter.h,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 16,
          boxSizing: 'border-box',
          borderRadius: 16,
          border: `1.5px solid ${colors.border}`,
          backgroundColor: colors.surfaceSubtle,
          boxShadow: `0 2px 8px ${colors.secondary}12`,
        }}
      >
        <div>
          <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: TEXT.primary }}>Names available</div>
          <div style={{ fontFamily: SANS, fontSize: 11, color: TEXT.secondary, marginTop: 2 }}>
            {screen.filtersApplied ? 'Filters applied' : 'No filters applied'}
          </div>
        </div>
        <div style={{ fontFamily: GABARITO, fontWeight: 800, fontSize: 28, color: colors.primary }}>
          {screen.count.toLocaleString('en-US')}
        </div>
      </div>

      {/* ScrollView */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: FILTERS.scrollTop,
          width: DEVICE_W,
          height: DEVICE_H - FILTERS.scrollTop,
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', left: 0, top: -screen.scroll, width: DEVICE_W, height: 1200 }}>
          <div
            style={{
              position: 'absolute',
              left: FILTERS.contentX,
              top: FILTERS.genderTitle,
              fontFamily: GABARITO,
              fontWeight: 800,
              fontSize: 16,
              color: TEXT.primary,
            }}
          >
            Gender
          </div>
          <div
            style={{
              position: 'absolute',
              left: FILTERS.contentX,
              width: FILTERS.contentW,
              top: FILTERS.genderBar.y,
              height: FILTERS.genderBar.h,
              display: 'flex',
              padding: 4,
              boxSizing: 'border-box',
              borderRadius: 12,
              backgroundColor: colors.surfaceSubtle,
            }}
          >
            {(['male', 'neutral', 'female'] as const).map((g) => {
              const isSelected = g === 'neutral';
              return (
                <div
                  key={g}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    borderRadius: 8,
                    backgroundColor: isSelected ? '#FFFFFF' : 'transparent',
                    boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  <span style={{ fontSize: 16 }}>{GENDER_BADGES[g].emoji}</span>
                  <span
                    style={{
                      fontFamily: SANS,
                      fontSize: 14,
                      fontWeight: 600,
                      color: isSelected ? TEXT.primary : TEXT.secondary,
                    }}
                  >
                    {g === 'male' ? 'Boy' : g === 'female' ? 'Girl' : 'Both'}
                  </span>
                </div>
              );
            })}
          </div>

          <div
            style={{
              position: 'absolute',
              left: FILTERS.contentX,
              width: FILTERS.contentW,
              top: FILTERS.categoriesTitle,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: GABARITO, fontWeight: 800, fontSize: 16, color: TEXT.primary }}>
                Categories
              </span>
              <span
                style={{
                  fontFamily: SANS,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 10,
                  backgroundColor: selected === null ? colors.primaryLight : colors.primary,
                  color: selected === null ? colors.tabActive : '#FFFFFF',
                }}
              >
                {badgeText}
              </span>
            </div>
            <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}>
              <Icon name="chevronDown" size={16} color={TEXT.muted} />
            </span>
          </div>

          <div style={{ ...row(theme), top: FILTERS.allRow.y, height: FILTERS.allRow.h }}>
            <div>
              <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: TEXT.primary }}>All Categories</div>
              <div style={{ fontFamily: SANS, fontSize: 10, color: TEXT.muted, marginTop: 2 }}>
                Include every category
              </div>
            </div>
            <Switch value={screen.allSwitch} onColor={colors.primary} />
          </div>

          {CATEGORY_ROWS.map((label, i) => (
            <div key={label} style={{ ...row(theme), top: categoryRowY(i), height: FILTERS.rowH }}>
              <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: TEXT.primary }}>{label}</span>
              <Switch
                value={i === CELEBRITY_INDEX ? screen.celebritySwitch : screen.allSwitch}
                onColor={colors.primary}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
