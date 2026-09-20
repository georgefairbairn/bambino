import type React from 'react';
import { Composition } from 'remotion';
import {
  AD_FORMATS,
  COMPOSITION_IDS,
  DURATION_IN_FRAMES,
  FORMAT_SIZES,
  FPS,
} from './compositions';
import { MatchStory } from './MatchStory';

export const RemotionRoot: React.FC = () => (
  <>
    {AD_FORMATS.map((format) => (
      <Composition
        key={format}
        id={COMPOSITION_IDS[format]}
        component={MatchStory}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        width={FORMAT_SIZES[format].width}
        height={FORMAT_SIZES[format].height}
        defaultProps={{ format }}
      />
    ))}
  </>
);
