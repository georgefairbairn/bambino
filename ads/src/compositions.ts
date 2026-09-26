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
 * Which cut to render. `short` is 15s, for Meta's "15 seconds or less"
 * advice. A straight 4/3 speed-up read as rushed (George, 2026-09-25), so it
 * keeps every action at normal speed, runs a few still moments faster, and
 * replaces the Filters and popularity sections with one beat where both
 * phones show them side by side (see getScene).
 */
export type Pace = 'full' | 'short';

/** The short cut's side-by-side feature beat, in story frames. */
export const SPLIT_START = 345;
export const SPLIT_END = 422;

export const PACES: readonly Pace[] = ['full', 'short'] as const;

/**
 * The short cut as runs of story frames and their playback speed. Story time
 * is the full cut's frame numbering; skipped ranges (the solo Filters and
 * popularity sections, 422–518) are simply not listed. Speed-ups only cover
 * holds where nothing but the slow sway moves, and the sway follows output
 * time, so they don't show.
 */
export const SHORT_CUT: readonly { from: number; to: number; speed: number }[] = [
  { from: 0, to: 30, speed: 1 },
  { from: 30, to: 70, speed: 2.5 }, // the hook, fully legible, holding
  { from: 70, to: 116, speed: 1 },
  { from: 116, to: 128, speed: 2 }, // between solo swipes
  { from: 128, to: 140, speed: 1 },
  { from: 140, to: 152, speed: 2 },
  { from: 152, to: 164, speed: 1 },
  { from: 164, to: 180, speed: 2 }, // after Juniper, before the partner
  { from: 180, to: 244, speed: 1 },
  { from: 244, to: 264, speed: 2 }, // partner has kept Wren, before the stillness
  { from: 264, to: SPLIT_END, speed: 1 },
  { from: 518, to: DURATION_IN_FRAMES, speed: 1 }, // phones exit, end card
];

const outputFramesOf = (runs: typeof SHORT_CUT): number =>
  runs.reduce((sum, r) => sum + (r.to - r.from) / r.speed, 0);

export const PACE_FRAMES: Record<Pace, number> = {
  full: DURATION_IN_FRAMES,
  short: outputFramesOf(SHORT_CUT),
};

/** The story frame to draw on output frame `frame`. Fractional in sped-up runs. */
export const toStoryFrame = (frame: number, pace: Pace): number => {
  if (pace === 'full') return frame;
  let out = 0;
  for (const run of SHORT_CUT) {
    const length = (run.to - run.from) / run.speed;
    if (frame < out + length) return run.from + (frame - out) * run.speed;
    out += length;
  }
  return DURATION_IN_FRAMES - 1;
};
