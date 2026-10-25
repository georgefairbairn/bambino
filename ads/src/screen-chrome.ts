import { createContext, useContext } from 'react';
import { CARD_H } from './device';

/**
 * How much of the app's own screen furniture to draw. The ads crop the phone
 * below the card and the App Store preview captions that space, so both use a
 * shortened card and no tab bar. The website's cut shows the whole screen, so
 * it draws both as the app has them.
 */
export interface ScreenChrome {
  cardHeight: number;
  tabBar: boolean;
}

/**
 * The app's CARD_HEIGHT_FULL on an 852pt screen: SCREEN_HEIGHT - SAFE_AREA_TOP
 * - HEADER_HEIGHT - TAB_BAR_HEIGHT - 32 (constants/swipe.ts).
 */
export const APP_CARD_H = 852 - 50 - 64 - 80 - 32;

export const AD_CHROME: ScreenChrome = { cardHeight: CARD_H, tabBar: false };
export const APP_CHROME: ScreenChrome = { cardHeight: APP_CARD_H, tabBar: true };

export const ScreenChromeContext = createContext<ScreenChrome>(AD_CHROME);

export const useScreenChrome = (): ScreenChrome => useContext(ScreenChromeContext);
