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
import { CAST, SITE_CAST, type Cast } from './names';
import { type PhoneScene, getScene } from './scene';
import { AD_CHROME, APP_CHROME, ScreenChromeContext } from './screen-chrome';
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

/**
 * The App Store app preview. See app-preview.ts. `web` renders the website's
 * cut: no caption (the page sets its own text under the phone), and the whole
 * screen as the app draws it, with its full-height card and tab bar. `phone`
 * picks one partner's screen for the whole cut instead of cutting to the
 * partner's, for the site's side-by-side phones. The web cut uses SITE_CAST
 * unless a cast is passed.
 */
export const AppPreview: React.FC<{ cast?: Cast; web?: boolean; phone?: 'mint' | 'blue' }> = ({
  cast: castProp,
  web = false,
  phone,
}) => {
  const cast = castProp ?? (web ? SITE_CAST : CAST);
  const frame = toPreviewStoryFrame(useCurrentFrame());
  // No sway: a full-bleed screen that drifted would show its edges.
  const scene = getScene(frame, PREVIEW_LAYOUT, cast, { swayFrame: 0 });
  const [mint, blue] = scene.phones as [PhoneScene, PhoneScene];
  const partner = phone === undefined ? partnerOpacity(frame) : phone === 'blue' ? 1 : 0;

  return (
    <ScreenChromeContext.Provider value={web ? APP_CHROME : AD_CHROME}>
      <StoryClockContext.Provider value={{ frame, pace: 'full' }}>
        <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#fff' }}>
          {partner < 1 && <Screen scene={mint} cast={cast} />}
          {partner > 0 && <Screen scene={blue} cast={cast} opacity={partner} />}
          {!web && (
            <>
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
            </>
          )}
        </AbsoluteFill>
      </StoryClockContext.Provider>
    </ScreenChromeContext.Provider>
  );
};
