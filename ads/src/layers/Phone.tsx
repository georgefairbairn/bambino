import type React from 'react';
import { BEZEL, DEVICE_H, DEVICE_W, PHONE_H, PHONE_W } from '../device';
import { CAST, type Cast } from '../names';
import { type PhoneScene } from '../scene';
import { AD_THEMES } from '../theme';
import { Confetti } from './Confetti';
import { DetailSheet } from './DetailSheet';
import { ExploreScreen } from './ExploreScreen';
import { FiltersScreen } from './FiltersScreen';
import { StatusBar } from './StatusBar';
import { TapIndicator } from './TapIndicator';

const SCREEN_RADIUS = 55;

export const screenBackground = (theme: PhoneScene['theme']): string => {
  const { screenBg } = AD_THEMES[theme];
  return `linear-gradient(180deg, ${screenBg[0]}, ${screenBg[1]}, ${screenBg[2]})`;
};

/**
 * A head-on iPhone drawn in points and scaled up. Its bottom bleeds off the
 * frame, which is the crop George asked for: near full width, cropped height.
 */
export const Phone: React.FC<{
  scene: PhoneScene;
  /** Composition width, so the phone can centre itself at any scale. */
  frameWidth: number;
  cast?: Cast;
}> = ({ scene, frameWidth, cast = CAST }) => {
  const scale = scene.scale;
  const left = (frameWidth - PHONE_W * scale) / 2 + scene.x;

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top: scene.y,
        width: PHONE_W * scale,
        height: PHONE_H * scale,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: PHONE_W,
          height: PHONE_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: SCREEN_RADIUS + BEZEL,
            backgroundColor: '#1B1B1F',
            border: '1.5px solid #4A5A6C',
            boxSizing: 'border-box',
            boxShadow: '0 30px 60px rgba(45,27,78,0.22), 0 8px 18px rgba(45,27,78,0.12)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: BEZEL,
            top: BEZEL,
            width: DEVICE_W,
            height: DEVICE_H,
            borderRadius: SCREEN_RADIUS,
            overflow: 'hidden',
            background: screenBackground(scene.theme),
          }}
        >
          <PhoneScreen scene={scene} cast={cast} />
        </div>
      </div>
    </div>
  );
};

/**
 * What the phone shows, at 393x852 points with no bezel. It draws only the
 * layers; the caller supplies the clipping box and its screenBackground, so
 * the ads' phones render exactly as before this was split out. The App Store
 * preview draws it full-bleed.
 */
export const PhoneScreen: React.FC<{
  scene: PhoneScene;
  cast?: Cast;
  /** False for the App Store preview, which is a screen capture, not a device. */
  island?: boolean;
}> = ({ scene, cast = CAST, island = true }) => {
  const bg = screenBackground(scene.theme);
  const { stack } = scene;

  return (
    <>
      {/* Base screen, nudged left as a pushed screen slides over it, like UINavigationController. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translateX(${-stack.push * DEVICE_W * 0.3}px)`,
        }}
      >
        {stack.base.kind === 'explore' && <ExploreScreen screen={stack.base} theme={scene.theme} />}
      </div>

      {stack.pushed && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: bg,
            transform: `translateX(${(1 - stack.push) * DEVICE_W}px)`,
            boxShadow: '-8px 0 24px rgba(0,0,0,0.08)',
          }}
        >
          {stack.pushed.kind === 'filters' && (
            <FiltersScreen screen={stack.pushed} theme={scene.theme} />
          )}
        </div>
      )}

      {stack.sheet?.kind === 'detail' && (
        <DetailSheet
          screen={stack.sheet}
          name={cast.esme}
          theme={scene.theme}
          progress={stack.sheetProgress}
        />
      )}

      {scene.confetti !== null && (
        <Confetti progress={scene.confetti} seed={scene.id === 'A' ? 1987 : 2024} />
      )}
      {scene.tap && <TapIndicator tap={scene.tap} />}
      <StatusBar island={island} />
    </>
  );
};
