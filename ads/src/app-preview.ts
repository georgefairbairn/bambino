/**
 * The App Store app preview: the ad's story as a screen capture. Apple wants
 * previews to show the app itself, so there is no device frame, no hook card
 * and no end card with the App Store badge; the screen fills the frame and a
 * caption sits in the empty space below the card.
 */
import { DEVICE_H, DEVICE_W } from './device';
import { type AdLayout } from './layout';

export const PREVIEW_ID = 'AppPreview';

/** Apple's portrait preview size for 6.5", 6.7" and 6.9" iPhones. */
export const PREVIEW_SIZE = { width: 886, height: 1920 } as const;

/** Pixels per app point. 393pt across 886px also covers 852pt in 1920px. */
export const PREVIEW_SCALE = PREVIEW_SIZE.width / DEVICE_W;

/**
 * The preview as runs of story frames. It opens on the first card, already in
 * place, with its caption fully revealed (the reveal starts at 75, with the
 * phone's entrance, and finishes by 103), and closes on the finished
 * popularity chart. The holds keep it over Apple's 15-second minimum and give
 * the opening a still poster frame.
 */
export const POSTER_FRAME = 103;

export const PREVIEW_CUT: readonly { from: number; to: number; hold?: number }[] = [
  { from: POSTER_FRAME, to: POSTER_FRAME, hold: 20 },
  { from: POSTER_FRAME, to: 518 },
  { from: 517, to: 517, hold: 40 },
];

export const PREVIEW_FRAMES = PREVIEW_CUT.reduce((sum, r) => sum + (r.hold ?? r.to - r.from), 0);

/** The story frame to draw on output frame `frame`. */
export const toPreviewStoryFrame = (frame: number): number => {
  let out = 0;
  for (const run of PREVIEW_CUT) {
    const length = run.hold ?? run.to - run.from;
    if (frame < out + length) return run.hold ? run.from : run.from + (frame - out);
    out += length;
  }
  return PREVIEW_CUT[PREVIEW_CUT.length - 1]!.to;
};

/**
 * Story frames where the partner's blue screen is shown instead of mint. Mint
 * has just binned Wren (214–226); blue keeps it (232–244), then the cut goes
 * back to mint for the Esme swipe at 290.
 */
export const PARTNER_SHOT = { from: 228, to: 262 } as const;

/** Frames over which one screen dissolves into the other. */
export const SHOT_FADE = 6;

/** How much of the partner's screen shows on story frame `frame`, 0 → 1. */
export const partnerOpacity = (frame: number): number => {
  const fadeIn = (frame - PARTNER_SHOT.from) / SHOT_FADE;
  const fadeOut = (PARTNER_SHOT.to - frame) / SHOT_FADE;
  return Math.min(1, Math.max(0, Math.min(fadeIn, fadeOut)));
};

/**
 * getScene's layout for a full-bleed screen: one slot at the top, no shrink
 * while two phones would be on screen. Only `headline` is the preview's own;
 * hook, split and endCard are never drawn here.
 */
export const PREVIEW_LAYOUT: AdLayout = {
  ...PREVIEW_SIZE,
  phoneScale: PREVIEW_SCALE,
  matchScale: PREVIEW_SCALE,
  slots: { hidden: PREVIEW_SIZE.height, solo: 0, top: 0, bottom: 0 },
  slotX: { hidden: 0, solo: 0, top: 0, bottom: 0 },
  // The card ends at 642pt (1447px); the caption sits in the space below it.
  headline: { top: 1530, fontSize: 64, sidePadding: 56 },
  hook: { fontSize: 0 },
  split: { y: 0, scale: PREVIEW_SCALE, xA: 0, xB: 0 },
  endCard: { finePrintBottom: 0 },
};

/** The screen's drawn height, a pixel taller than the frame, which crops it. */
export const PREVIEW_SCREEN_H = DEVICE_H * PREVIEW_SCALE;

/**
 * A pale fade behind the caption. Explore and the popularity sheet leave the
 * space empty, but the Filters list runs underneath it; the fade starts below
 * the Celebrity row (~1430px), so the toggle being tapped stays clear.
 */
export const CAPTION_SCRIM = { from: 1440, solid: 1530 } as const;
