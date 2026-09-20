import type React from 'react';
import { AbsoluteFill, Composition } from 'remotion';
import {
  AD_FORMATS,
  COMPOSITION_IDS,
  DURATION_IN_FRAMES,
  FORMAT_SIZES,
  FPS,
} from './compositions';

const Placeholder: React.FC = () => <AbsoluteFill style={{ backgroundColor: '#EFFDF4' }} />;

export const RemotionRoot: React.FC = () => (
  <>
    {AD_FORMATS.map((format) => (
      <Composition
        key={format}
        id={COMPOSITION_IDS[format]}
        component={Placeholder}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        width={FORMAT_SIZES[format].width}
        height={FORMAT_SIZES[format].height}
      />
    ))}
  </>
);
