import { loadFont } from '@remotion/google-fonts/Gabarito';

/**
 * Gabarito, matching `@expo-google-fonts/gabarito` in the app. The app uses
 * Gabarito_800ExtraBold for display type, so weight 800 is the one that
 * matters here.
 */
const { fontFamily } = loadFont('normal', { weights: ['400', '800'], subsets: ['latin'] });

export const GABARITO = fontFamily;
