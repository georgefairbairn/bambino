import { describe, expect, it } from 'vitest';
import {
  PARTNER_SHOT,
  POSTER_FRAME,
  PREVIEW_CUT,
  PREVIEW_FRAMES,
  PREVIEW_LAYOUT,
  PREVIEW_SCREEN_H,
  PREVIEW_SIZE,
  partnerOpacity,
  toPreviewStoryFrame,
} from './app-preview';
import { FPS } from './compositions';
import { BEATS, getHeadline, getHeadlineStart } from './timeline';
import { getHeadlineWordProgress, getWordPop } from './motion';

describe('App Store app preview', () => {
  it("uses Apple's portrait preview size for large iPhones", () => {
    expect(PREVIEW_SIZE).toEqual({ width: 886, height: 1920 });
  });

  it('runs between 15 and 30 seconds, as App Store Connect requires', () => {
    const seconds = PREVIEW_FRAMES / FPS;
    expect(seconds).toBeGreaterThanOrEqual(15);
    expect(seconds).toBeLessThanOrEqual(30);
  });

  it('fills the frame with the screen, with no gap at the bottom', () => {
    expect(PREVIEW_SCREEN_H).toBeGreaterThanOrEqual(PREVIEW_SIZE.height);
  });

  it('never shows the hook card or the end card', () => {
    const hook = BEATS.find((b) => b.id === 'hook')!;
    const end = BEATS.find((b) => b.id === 'end')!;
    for (let f = 0; f < PREVIEW_FRAMES; f++) {
      const story = toPreviewStoryFrame(f);
      expect(story).toBeGreaterThanOrEqual(hook.from + hook.durationInFrames);
      expect(story).toBeLessThan(end.from);
    }
  });

  it('plays story time forward, never backwards', () => {
    for (let f = 1; f < PREVIEW_FRAMES; f++) {
      expect(toPreviewStoryFrame(f)).toBeGreaterThanOrEqual(toPreviewStoryFrame(f - 1));
    }
  });

  it('holds a poster frame whose caption has revealed, before Olivia moves', () => {
    expect(toPreviewStoryFrame(0)).toBe(POSTER_FRAME);
    expect(getHeadlineStart(POSTER_FRAME)).not.toBeNull();
    const words = getHeadline(POSTER_FRAME)!.split(' ');
    // The last word is still settling from its overshoot (scale ~1.01), which
    // doesn't read in a still; the next frame starts the first swipe.
    for (const p of getHeadlineWordProgress(POSTER_FRAME, FPS, words.length, BEATS)) {
      const pop = getWordPop(p);
      expect(pop.opacity).toBe(1);
      expect(Math.abs(pop.scale - 1)).toBeLessThan(0.02);
    }
    expect(POSTER_FRAME).toBeLessThan(104);
  });

  it('cuts to the partner only while they keep Wren, and back before the Esme swipe', () => {
    expect(partnerOpacity(PARTNER_SHOT.from)).toBe(0);
    expect(partnerOpacity(238)).toBe(1);
    expect(partnerOpacity(PARTNER_SHOT.to)).toBe(0);
    expect(PARTNER_SHOT.to).toBeLessThan(290);
  });

  it('keeps the caption below the card', () => {
    // CARD_Y + CARD_H = 642pt.
    expect(PREVIEW_LAYOUT.headline.top).toBeGreaterThan(642 * PREVIEW_LAYOUT.phoneScale);
  });

  it('covers every output frame with one run', () => {
    expect(PREVIEW_CUT.length).toBeGreaterThan(0);
    expect(toPreviewStoryFrame(PREVIEW_FRAMES - 1)).toBe(517);
  });
});
