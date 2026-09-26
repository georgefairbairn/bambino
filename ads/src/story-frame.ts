import { createContext, useContext } from 'react';
import { useCurrentFrame } from 'remotion';
import { type Pace } from './compositions';

export interface StoryClock {
  /** The full cut's frame number being drawn. Jumps and runs fast in the 15s cut. */
  frame: number;
  pace: Pace;
}

/**
 * The story frame MatchStory is drawing, which differs from the output frame
 * in the 15s cut. Layers that animate on their own clock read this instead of
 * useCurrentFrame, so they stay in step with the phones.
 */
export const StoryClockContext = createContext<StoryClock | null>(null);

export const useStoryClock = (): StoryClock => {
  const outputFrame = useCurrentFrame();
  return useContext(StoryClockContext) ?? { frame: outputFrame, pace: 'full' };
};

export const useStoryFrame = (): number => useStoryClock().frame;
