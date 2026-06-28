/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform, type TextStyle } from 'react-native';

export type ThemeKey = 'pink' | 'mint' | 'blue' | 'yellow';

export interface CandyTheme {
  primary: string;
  primaryLight: string;
  secondary: string;
  secondaryLight: string;
  surfaceSubtle: string;
  border: string;
  tabActive: string;
}

export interface CandyThemeGradients {
  screenBg: readonly [string, string, string];
  screenBgDark: readonly [string, string, string];
  authBg: readonly [string, string, string];
  buttonPrimary: readonly [string, string];
  card: readonly [string, string];
}

export const CANDY_THEMES: Record<ThemeKey, CandyTheme> = {
  pink: {
    primary: '#FF5C8A',
    primaryLight: '#FFE4EC',
    secondary: '#A78BFA',
    secondaryLight: '#F3E8FF',
    surfaceSubtle: '#FFF0F5',
    border: '#F3E4EB',
    tabActive: '#D63A6A',
  },
  mint: {
    primary: '#34D399',
    primaryLight: '#D1FAE5',
    secondary: '#6EE7B7',
    secondaryLight: '#ECFDF5',
    surfaceSubtle: '#F0FDF4',
    border: '#D1FAE5',
    tabActive: '#059669',
  },
  blue: {
    primary: '#60A5FA',
    primaryLight: '#DBEAFE',
    secondary: '#93C5FD',
    secondaryLight: '#EFF6FF',
    surfaceSubtle: '#EFF6FF',
    border: '#DBEAFE',
    tabActive: '#2563EB',
  },
  yellow: {
    primary: '#FBBF24',
    primaryLight: '#FEF3C7',
    secondary: '#FCD34D',
    secondaryLight: '#FFFBEB',
    surfaceSubtle: '#FFFBEB',
    border: '#FDE68A',
    tabActive: '#D97706',
  },
};

const THEME_GRADIENTS: Record<ThemeKey, CandyThemeGradients> = {
  pink: {
    screenBg: ['#FFF0F5', '#FFE4EC', '#F5E6FF'],
    screenBgDark: ['#F5E6FF', '#E8D5F5', '#DBC4EB'],
    authBg: ['#FFF5F5', '#FFE4EC', '#E8D5F5'],
    buttonPrimary: ['#FF7EB3', '#FF5C8A'],
    card: ['#FFFFFF', '#FFF8FA'],
  },
  mint: {
    screenBg: ['#F0FDF4', '#D1FAE5', '#ECFDF5'],
    screenBgDark: ['#ECFDF5', '#D1FAE5', '#A7F3D0'],
    authBg: ['#F0FDF4', '#D1FAE5', '#ECFDF5'],
    buttonPrimary: ['#6EE7B7', '#34D399'],
    card: ['#FFFFFF', '#F0FDF4'],
  },
  blue: {
    screenBg: ['#EFF6FF', '#DBEAFE', '#E0E7FF'],
    screenBgDark: ['#E0E7FF', '#C7D2FE', '#BFDBFE'],
    authBg: ['#EFF6FF', '#DBEAFE', '#E0E7FF'],
    buttonPrimary: ['#93C5FD', '#60A5FA'],
    card: ['#FFFFFF', '#EFF6FF'],
  },
  yellow: {
    screenBg: ['#FFFBEB', '#FEF3C7', '#FFF7ED'],
    screenBgDark: ['#FFF7ED', '#FDE68A', '#FCD34D'],
    authBg: ['#FFFBEB', '#FEF3C7', '#FFF7ED'],
    buttonPrimary: ['#FCD34D', '#FBBF24'],
    card: ['#FFFFFF', '#FFFBEB'],
  },
};

export interface ThemeMeta {
  key: ThemeKey;
  name: string;
  emoji: string;
  previewColors: [string, string];
}

export const THEME_META: ThemeMeta[] = [
  { key: 'pink', name: 'Blossom', emoji: '🌸', previewColors: ['#FF7EB3', '#FF5C8A'] },
  { key: 'mint', name: 'Mint', emoji: '🌿', previewColors: ['#6EE7B7', '#34D399'] },
  { key: 'blue', name: 'Lagoon', emoji: '💧', previewColors: ['#93C5FD', '#60A5FA'] },
  { key: 'yellow', name: 'Honeycomb', emoji: '🍯', previewColors: ['#FCD34D', '#FBBF24'] },
];

// Shared (non-themed) color values
const SHARED_COLORS = {
  tertiary: '#60D5B4',
  warm: '#FFB86C',
  success: '#4ADE80',
  danger: '#FF6B6B',
  textPrimary: '#2D1B4E',
  textSecondary: '#6B5B7B',
  textMuted: '#A89BB5',
  surface: '#FFFFFF',
  tabInactive: '#6B5B7B',
  genderMale: '#7CB9E8',
  genderFemale: '#FF8FAB',
  genderNeutral: '#C4A7E7',
};

// Shared (non-themed) gradient values
const SHARED_GRADIENTS = {
  buttonDanger: ['#FF6B6B', '#EE5A5A'] as const,
  accent: ['#A78BFA', '#818CF8'] as const,
  success: ['#6DD5A0', '#4ADE80'] as const,
};

export type CandyColorsType = CandyTheme & typeof SHARED_COLORS;
export type GradientsType = CandyThemeGradients & typeof SHARED_GRADIENTS;

export function getThemeColors(key: ThemeKey): CandyColorsType {
  return { ...SHARED_COLORS, ...CANDY_THEMES[key] };
}

export function getThemeGradients(key: ThemeKey): GradientsType {
  return { ...SHARED_GRADIENTS, ...THEME_GRADIENTS[key] };
}

// Default exports remain pink for backwards compatibility
export const CandyColors = getThemeColors('pink');

export const Colors = {
  light: {
    text: CandyColors.textPrimary,
    background: '#FFF0F5',
    tint: CandyColors.primary,
    icon: CandyColors.textMuted,
    tabIconDefault: CandyColors.tabInactive,
    tabIconSelected: CandyColors.tabActive,
  },
  dark: {
    text: CandyColors.textPrimary,
    background: '#F5E6FF',
    tint: '#fff',
    icon: CandyColors.textMuted,
    tabIconDefault: CandyColors.tabInactive,
    tabIconSelected: '#fff',
  },
};

export const Gradients = getThemeGradients('pink');

export const Fonts = Platform.select({
  ios: {
    /** iOS system font */
    sans: undefined,
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
    /** Brand display font (Alfa Slab One) — "bambino" wordmark only */
    display: 'AlfaSlabOne_400Regular',
    /** Title font (Gabarito) — baby names, section headings, UI titles */
    title: 'Gabarito_800ExtraBold',
  },
  default: {
    sans: undefined,
    rounded: 'normal',
    mono: 'monospace',
    display: 'AlfaSlabOne_400Regular',
    title: 'Gabarito_800ExtraBold',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    display: 'AlfaSlabOne_400Regular',
    title: 'Gabarito_800ExtraBold',
  },
});

/**
 * Canonical button-label typography. Buttons must read as one design language,
 * so all tappable labels share the system `sans` family and a fixed weight —
 * color/background carry state (selected, variant), never the font family or weight.
 *
 * Spread a token into a label's style and set color at the call site:
 *   <Text style={[BUTTON_TEXT.cta, { color: '#fff' }]}>…</Text>
 *
 * Override `fontSize` only where a layout is genuinely space-constrained
 * (e.g. a compact 3-up segmented control); keep family and weight intact.
 */
export const BUTTON_TEXT: Record<'cta' | 'pill' | 'link' | 'badge', TextStyle> = {
  /** Full-width primary / secondary / danger calls-to-action. */
  cta: { fontFamily: Fonts?.sans, fontSize: 16, fontWeight: '600' },
  /** Segmented controls, filter chips, and tab labels. */
  pill: { fontFamily: Fonts?.sans, fontSize: 14, fontWeight: '600' },
  /** Inline text links ("Forgot password?", "Cancel"). */
  link: { fontFamily: Fonts?.sans, fontSize: 14, fontWeight: '600' },
  /** Small status badges and counters. */
  badge: { fontFamily: Fonts?.sans, fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
};
