import { type AdFormat, FORMAT_SIZES } from './compositions';

export type Slot = 'hidden' | 'solo' | 'top' | 'bottom';

export interface AdLayout {
  width: number;
  height: number;
  /** Pixels per app point in the single-phone sections. */
  phoneScale: number;
  /**
   * Pixels per app point while two phones are stacked. Equal to phoneScale on
   * the Reel; smaller on Feed and Square, where full-size stacked phones crop
   * the matched name out of the celebration.
   */
  matchScale: number;
  /** Top edge of the phone in px for each slot. Phones bleed off the bottom. */
  slots: Record<Slot, number>;
  headline: { top: number; fontSize: number; sidePadding: number };
  hook: { fontSize: number };
  /**
   * Distance in px from the bottom edge to the in-app purchases line. Reels
   * cover the bottom 35% with the caption and Install button (Meta's safe
   * zone), so the Reel keeps it just above that. Feed and square have no
   * overlay, so it sits near the edge.
   */
  endCard: { finePrintBottom: number };
}

type Spec = Omit<AdLayout, 'width' | 'height'>;

const SPECS: Record<AdFormat, Spec> = {
  reel: {
    phoneScale: 2.25,
    matchScale: 2.25,
    slots: { hidden: 1980, solo: 380, top: 360, bottom: 1160 },
    headline: { top: 130, fontSize: 80, sidePadding: 64 },
    hook: { fontSize: 108 },
    endCard: { finePrintBottom: 680 },
  },
  feed: {
    phoneScale: 2.0,
    matchScale: 1.7,
    slots: { hidden: 1410, solo: 250, top: 222, bottom: 780 },
    headline: { top: 60, fontSize: 64, sidePadding: 60 },
    hook: { fontSize: 92 },
    endCard: { finePrintBottom: 48 },
  },
  square: {
    phoneScale: 1.8,
    matchScale: 1.45,
    slots: { hidden: 1140, solo: 200, top: 160, bottom: 612 },
    headline: { top: 36, fontSize: 50, sidePadding: 56 },
    hook: { fontSize: 84 },
    endCard: { finePrintBottom: 40 },
  },
};

export const getLayout = (format: AdFormat): AdLayout => ({
  ...FORMAT_SIZES[format],
  ...SPECS[format],
});
