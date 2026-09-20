import type React from 'react';
import { AbsoluteFill, Composition } from 'remotion';
import {
  AD_FORMATS,
  type AdFormat,
  COMPOSITION_IDS,
  DURATION_IN_FRAMES,
  FORMAT_SIZES,
  FPS,
} from './compositions';
import { Backdrop } from './layers/Backdrop';
import { Headline } from './layers/Headline';

const MatchStory: React.FC<{ format: AdFormat }> = ({ format }) => (
  <AbsoluteFill>
    <Backdrop />
    <Headline format={format} />
  </AbsoluteFill>
);

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
