import { loadFont as loadAlfaSlabOne } from '@remotion/google-fonts/AlfaSlabOne';
import { loadFont as loadGabarito } from '@remotion/google-fonts/Gabarito';
import { loadFont as loadPoppins } from '@remotion/google-fonts/Poppins';

/**
 * Three font roles, each verified against the source:
 *
 * - POPPINS 600: marketing headlines. The App Store screenshots are Poppins
 *   SemiBold; 700 and 800 are visibly heavier against the published stills.
 * - GABARITO 800: baby names and UI titles. `Fonts.title` in constants/theme.ts.
 * - ALFA_SLAB_ONE: the lowercase "bambino" wordmark only. `Fonts.display`.
 * - SANS: body text. `Fonts.sans` is undefined on iOS, i.e. the system font,
 *   which Chrome on the macOS render machine resolves to SF Pro.
 */
export const POPPINS = loadPoppins('normal', { weights: ['600'], subsets: ['latin'] }).fontFamily;
export const GABARITO = loadGabarito('normal', { weights: ['800'], subsets: ['latin'] }).fontFamily;
export const ALFA_SLAB_ONE = loadAlfaSlabOne('normal', { weights: ['400'], subsets: ['latin'] })
  .fontFamily;
export const SANS =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif";
