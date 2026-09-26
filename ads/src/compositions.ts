export const FPS = 30;
export const DURATION_IN_FRAMES = 600;

export type AdFormat = 'reel' | 'feed' | 'square' | 'landscape';

export const AD_FORMATS: readonly AdFormat[] = ['reel', 'feed', 'square', 'landscape'] as const;

export const COMPOSITION_IDS: Record<AdFormat, string> = {
  reel: 'MatchStory-Reel',
  feed: 'MatchStory-Feed',
  square: 'MatchStory-Square',
  landscape: 'MatchStory-Landscape',
};

export const FORMAT_SIZES: Record<AdFormat, { width: number; height: number }> = {
  reel: { width: 1080, height: 1920 },
  feed: { width: 1080, height: 1350 },
  square: { width: 1080, height: 1080 },
  landscape: { width: 1920, height: 1080 },
};

/**
 * How fast the story plays. `short` is the full story at 4/3 speed, 15s, for
 * Meta's "15 seconds or less" recommendation (George picked speed-up over
 * cutting sections, 2026-09-25).
 */
export type Pace = 'full' | 'short';

export const PACES: readonly Pace[] = ['full', 'short'] as const;

export const PACE_FRAMES: Record<Pace, number> = { full: DURATION_IN_FRAMES, short: 450 };

/**
 * The story frame to draw on output frame `frame`. Fractional in the short
 * cut: the scene interpolates between keyframes, so motion stays smooth
 * rather than skipping every fourth frame.
 */
export const toStoryFrame = (frame: number, pace: Pace): number =>
  pace === 'full'
    ? frame
    : Math.min(DURATION_IN_FRAMES - 1, frame * (DURATION_IN_FRAMES / PACE_FRAMES.short));
