import type React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import {
  CAPTION_SCRIM,
  PREVIEW_LAYOUT,
  PREVIEW_SCALE,
  partnerOpacity,
  toPreviewStoryFrame,
} from './app-preview';
import { DEVICE_H, DEVICE_W } from './device';
import { CAST, type Cast } from './names';
import { type PhoneScene, getScene } from './scene';
import { StoryClockContext } from './story-frame';
import { getHeadlines } from './timeline';
import { Headline } from './layers/Headline';
import { PhoneScreen, screenBackground } from './layers/Phone';

const Screen: React.FC<{ scene: PhoneScene; cast: Cast; opacity?: number }> = ({
  scene,
  cast,
  opacity = 1,
}) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      width: DEVICE_W,
      height: DEVICE_H,
      transform: `scale(${PREVIEW_SCALE})`,
      transformOrigin: 'top left',
      overflow: 'hidden',
      background: screenBackground(scene.theme),
      opacity,
    }}
  >
    <PhoneScreen scene={scene} cast={cast} island={false} />
  </div>
);

/** The App Store app preview. See app-preview.ts. */
export const AppPreview: React.FC<{ cast?: Cast }> = ({ cast = CAST }) => {
  const frame = toPreviewStoryFrame(useCurrentFrame());
  // No sway: a full-bleed screen that drifted would show its edges.
  const scene = getScene(frame, PREVIEW_LAYOUT, cast, { swayFrame: 0 });
  const [mint, blue] = scene.phones as [PhoneScene, PhoneScene];
  const partner = partnerOpacity(frame);

  return (
    <StoryClockContext.Provider value={{ frame, pace: 'full' }}>
      <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#fff' }}>
        <Screen scene={mint} cast={cast} />
        {partner > 0 && <Screen scene={blue} cast={cast} opacity={partner} />}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: CAPTION_SCRIM.from,
            bottom: 0,
            background: `linear-gradient(180deg, rgba(255,255,255,0) 0px, rgba(255,255,255,0.92) ${
              CAPTION_SCRIM.solid - CAPTION_SCRIM.from
            }px)`,
          }}
        />
        <Headline layout={PREVIEW_LAYOUT} headlines={getHeadlines('looking')} />
      </AbsoluteFill>
    </StoryClockContext.Provider>
  );
};
