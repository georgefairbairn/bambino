import { type AdFormat, FORMAT_SIZES } from './compositions';

export type Slot = 'hidden' | 'solo' | 'top' | 'bottom';

export interface AdLayout {
  width: number;
  height: number;
  /** Pixels per app point in the single-phone sections. */
  phoneScale: number;
  /**
   * Pixels per app point while two phones are on screen. Equal to phoneScale
   * on the Reel; smaller elsewhere, where full-size phones crop the matched
   * name out of the celebration or don't fit side by side.
   */
  matchScale: number;
  /** Top edge of the phone in px for each slot. Phones bleed off the bottom. */
  slots: Record<Slot, number>;
  /**
   * Phone centre's offset from the frame's centre, in px, for each slot. Zero
   * in the portrait formats, where the phones stack; landscape puts them on
   * the right of the headline, side by side while both are on screen.
   */
  slotX: Record<Slot, number>;
  /**
   * The headline slot. `maxWidth` with `align: 'left'` makes it a left column
   * (landscape); otherwise it spans the frame, centred.
   */
  headline: {
    top: number;
    fontSize: number;
    sidePadding: number;
    align?: 'center' | 'left';
    maxWidth?: number;
  };
  hook: { fontSize: number };
  /**
   * Distance in px from the bottom edge to the in-app purchases line. Reels
   * cover the bottom 35% with the caption and Install button (Meta's safe
   * zone), so the Reel keeps it just above that. The other formats have no
   * overlay, so it sits near the edge.
   */
  endCard: { finePrintBottom: number };
}

type Spec = Omit<AdLayout, 'width' | 'height'>;

const CENTRED: Record<Slot, number> = { hidden: 0, solo: 0, top: 0, bottom: 0 };

const SPECS: Record<AdFormat, Spec> = {
  reel: {
    phoneScale: 2.25,
    matchScale: 2.25,
    slots: { hidden: 1980, solo: 380, top: 360, bottom: 1160 },
    slotX: CENTRED,
    headline: { top: 130, fontSize: 80, sidePadding: 64 },
    hook: { fontSize: 108 },
    endCard: { finePrintBottom: 680 },
  },
  feed: {
    phoneScale: 2.0,
    matchScale: 1.7,
    slots: { hidden: 1410, solo: 250, top: 222, bottom: 780 },
    slotX: CENTRED,
    headline: { top: 60, fontSize: 64, sidePadding: 60 },
    hook: { fontSize: 92 },
    endCard: { finePrintBottom: 48 },
  },
  square: {
    phoneScale: 1.8,
    matchScale: 1.45,
    slots: { hidden: 1140, solo: 200, top: 160, bottom: 612 },
    slotX: CENTRED,
    headline: { top: 36, fontSize: 50, sidePadding: 56 },
    hook: { fontSize: 84 },
    endCard: { finePrintBottom: 40 },
  },
  // 16:9. Headline in a left column; the phones share the right, solo in its
  // middle, then side by side once the partner joins, both showing the match.
  landscape: {
    phoneScale: 1.35,
    matchScale: 1.1,
    slots: { hidden: 1140, solo: 150, top: 150, bottom: 150 },
    slotX: { hidden: 395, solo: 395, top: 151, bottom: 639 },
    headline: { top: 360, fontSize: 76, sidePadding: 100, align: 'left', maxWidth: 680 },
    hook: { fontSize: 120 },
    endCard: { finePrintBottom: 40 },
  },
};

/**
 * The end card was designed on the 1080-wide portrait frames. Landscape scales
 * it by height, the tight side there, so the badge and fine print still fit.
 */
export const getEndCardScale = (layout: AdLayout): number =>
  Math.min(layout.width, layout.height) / 1080;

export const getLayout = (format: AdFormat): AdLayout => ({
  ...FORMAT_SIZES[format],
  ...SPECS[format],
});
