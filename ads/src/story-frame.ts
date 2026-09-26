import { createContext, useContext } from 'react';
import { useCurrentFrame } from 'remotion';

/**
 * The story frame MatchStory is drawing, which runs faster than the output
 * frame in the 15s cut. Layers that animate on their own clock read this
 * instead of useCurrentFrame, so they speed up with everything else.
 */
export const StoryFrameContext = createContext<number | null>(null);

export const useStoryFrame = (): number => {
  const outputFrame = useCurrentFrame();
  return useContext(StoryFrameContext) ?? outputFrame;
};
