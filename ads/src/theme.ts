/**
 * Values COPIED from the app, never imported: `constants/theme.ts` imports
 * react-native and does not resolve in a browser bundle. If the app's palette
 * changes, update this file by hand.
 */

export type AdTheme = 'mint' | 'blue';

/** constants/theme.ts — CANDY_THEMES and THEME_GRADIENTS for mint and blue. */
export const AD_THEMES = {
  mint: {
    primary: '#34D399',
    primaryLight: '#D1FAE5',
    secondary: '#6EE7B7',
    secondaryLight: '#ECFDF5',
    surfaceSubtle: '#F0FDF4',
    border: '#D1FAE5',
    tabActive: '#059669',
    screenBg: ['#F0FDF4', '#D1FAE5', '#ECFDF5'] as const,
  },
  blue: {
    primary: '#60A5FA',
    primaryLight: '#DBEAFE',
    secondary: '#93C5FD',
    secondaryLight: '#EFF6FF',
    surfaceSubtle: '#EFF6FF',
    border: '#DBEAFE',
    tabActive: '#2563EB',
    screenBg: ['#EFF6FF', '#DBEAFE', '#E0E7FF'] as const,
  },
} as const satisfies Record<AdTheme, unknown>;

/** Fixed text colours used across the app's screens. */
export const TEXT = {
  primary: '#2D1B4E',
  secondary: '#6B5B7B',
  muted: '#A89BB5',
} as const;

/** constants/swipe.ts — SWIPE_COLORS. Fixed, never themed. */
export const SWIPE_COLORS = {
  like: '#34C77B',
  nope: '#FF5C8A',
} as const;

/** components/swipe/swipe-card.tsx — the colour flood during a swipe. */
export const SWIPE_GRADIENTS = {
  like: ['#34C77B', '#A3E4C4'],
  nope: ['#FF5C8A', '#FFB3C6'],
} as const;

/** components/swipe/swipe-card.tsx — UNDERLINE_COLORS. */
export const UNDERLINE_COLORS = {
  male: '#7CB9E8',
  female: '#FF8FAB',
  neutral: '#C4A7E7',
} as const;

/**
 * components/name-detail/gender-badge.tsx. Unisex takes the theme's
 * secondaryLight as its background, so it is resolved at render time.
 */
export const GENDER_BADGES = {
  male: { bg: '#E3F0FF', text: '#7CB9E8', label: 'Boy', emoji: '\u{1F466}' },
  female: { bg: '#FFE4EC', text: '#FF8FAB', label: 'Girl', emoji: '\u{1F467}' },
  neutral: { bg: null, text: '#C4A7E7', label: 'Unisex', emoji: '\u{1F476}' },
} as const;

/** components/swipe/swipe-card.tsx — TREND_CONFIG. */
export const TREND_STYLE = {
  rising: { arrow: '↑', color: '#4ADE80' },
  falling: { arrow: '↓', color: '#FF6B6B' },
  steady: { arrow: '→', color: '#A89BB5' },
} as const;

/** components/swipe/swipe-card.tsx — the `card` style. */
export const CARD = {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  borderWidth: 5,
  nameColor: TEXT.primary,
  underlineHeight: 6,
} as const;

/** Sampled from 01-couples.png and 04-matches.png. */
export const BACKDROP = {
  base: '#EFFDF4',
  circle: '#E1FCEC',
} as const;

/**
 * App Store headline green. Sampled as #059769, which is
 * CANDY_THEMES.mint.tabActive (#059669) after PNG rounding.
 */
export const HEADLINE_COLOR = '#059669';

/** App icon background, sampled from assets/images/icon.png. */
export const ICON_BG = '#CFF9E5';
