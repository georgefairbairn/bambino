export const FPS = 30;
export const DURATION_IN_FRAMES = 600;

export type AdFormat = 'reel' | 'feed' | 'square';

export const AD_FORMATS: readonly AdFormat[] = ['reel', 'feed', 'square'] as const;

export const COMPOSITION_IDS: Record<AdFormat, string> = {
  reel: 'MatchStory-Reel',
  feed: 'MatchStory-Feed',
  square: 'MatchStory-Square',
};

export const FORMAT_SIZES: Record<AdFormat, { width: number; height: number }> = {
  reel: { width: 1080, height: 1920 },
  feed: { width: 1080, height: 1350 },
  square: { width: 1080, height: 1080 },
};
