/**
 * The phone is laid out in iPhone points and then scaled, so every number the
 * app uses can be copied verbatim. Values mirror `constants/swipe.ts` and
 * `hooks/use-card-animation.ts`; they are copied, not imported, because those
 * modules import react-native.
 */

/** iPhone 15 Pro logical resolution. */
export const DEVICE_W = 393;
export const DEVICE_H = 852;

/** constants/swipe.ts */
export const SAFE_AREA_TOP = 50;
export const HEADER_HEIGHT = 64;
export const SWIPE_THRESHOLD = 120;
export const MAX_ROTATION = 12;
/** constants/swipe.ts — SCREEN_WIDTH + 100. */
export const EXIT_X = DEVICE_W + 100;
export const EXIT_Y = -200;
export const PEEK_SCALE = 0.95;
export const PEEK_TRANSLATE_Y = 8;

/**
 * hooks/use-card-animation.ts rotates with interpolate(x, [-200, 0, 200],
 * [12, 0, -12]). A right swipe therefore tilts ANTICLOCKWISE. v1 of the ad had
 * this backwards, and ROTATION_FACTOR in constants/swipe.ts is not used by it.
 */
export const ROTATION_RANGE = 200;

/** Card rectangle inside the screen. CARD_WIDTH is SCREEN_WIDTH - 32. */
export const CARD_X = 16;
export const CARD_W = DEVICE_W - 32;
export const CARD_Y = SAFE_AREA_TOP + HEADER_HEIGHT + 8;
/**
 * Shorter than the app's CARD_HEIGHT_FULL (626pt) so the whole card, including
 * the RANK / TREND row, sits inside the cropped phone. The app's swipe hint is
 * flexible space, so the card keeps every element at this height.
 */
export const CARD_H = 520;

/** Bezel around the screen, in points. */
export const BEZEL = 12;
export const PHONE_W = DEVICE_W + BEZEL * 2;
export const PHONE_H = DEVICE_H + BEZEL * 2;
