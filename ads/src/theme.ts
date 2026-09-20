/**
 * Hex values COPIED from the app, never imported.
 *
 * `constants/theme.ts` imports `react-native` for `Platform`, which does not
 * resolve in a browser bundle, so importing it here breaks the Remotion build.
 * This copy is the accepted drift risk recorded in the spec. If the app's
 * palette changes, update this file by hand.
 */

export type AdTheme = 'mint' | 'blue';

/** constants/theme.ts — CANDY_THEMES.mint / .blue, plus their screenBg gradients. */
export const AD_THEMES = {
  mint: {
    primary: '#34D399',
    primaryLight: '#D1FAE5',
    surfaceSubtle: '#F0FDF4',
    screenBg: ['#F0FDF4', '#D1FAE5', '#ECFDF5'] as const,
  },
  blue: {
    primary: '#60A5FA',
    primaryLight: '#DBEAFE',
    surfaceSubtle: '#EFF6FF',
    screenBg: ['#EFF6FF', '#DBEAFE', '#E0E7FF'] as const,
  },
} as const satisfies Record<AdTheme, unknown>;

/** constants/swipe.ts — SWIPE_COLORS. Fixed, never themed. */
export const SWIPE_COLORS = {
  like: '#34C77B',
  nope: '#FF5C8A',
} as const;

/** components/swipe/swipe-card.tsx — UNDERLINE_COLORS. */
export const UNDERLINE_COLORS = {
  male: '#7CB9E8',
  female: '#FF8FAB',
  neutral: '#C4A7E7',
} as const;

/** components/name-detail/gender-badge.tsx — GENDER_CONFIG, keyed by the DB gender. */
export const GENDER_BADGES = {
  male: { bg: '#E3F0FF', text: '#7CB9E8', label: 'Boy' },
  female: { bg: '#FFE4EC', text: '#FF8FAB', label: 'Girl' },
  neutral: { bg: '#F3E8FF', text: '#C4A7E7', label: 'Unisex' },
} as const;

/** constants/swipe.ts CARD_STYLES + swipe-card.tsx type styles. */
export const CARD = {
  borderRadius: 24,
  backgroundColor: '#FFFBF5',
  shadowColor: '#A78BFA',
  nameColor: '#2D1B4E',
  nameFontSize: 56,
  underlineHeight: 6,
  paddingHorizontal: 24,
  paddingTop: 48,
} as const;

/** Sampled from 01-couples.png and 04-matches.png on 2026-09-19. */
export const BACKDROP = {
  base: '#EFFDF4',
  circle: '#E1FCEC',
} as const;

/**
 * Sampled as #059769, which is CANDY_THEMES.mint.tabActive (#059669) after
 * PNG colour rounding. Using the token value, not the sampled one.
 */
export const HEADLINE_COLOR = '#059669';

/** Sampled from the phone edge in 04-matches.png. */
export const PHONE = {
  bezel: '#000000',
  frame: '#3A4A5C',
  borderRadius: 64,
  bezelWidth: 14,
} as const;
