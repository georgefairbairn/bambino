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
  const colors = AD_THEMES[scene.theme];
  const bg = `linear-gradient(180deg, ${colors.screenBg[0]}, ${colors.screenBg[1]}, ${colors.screenBg[2]})`;
  const { stack } = scene;

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
            background: bg,
          }}
        >
          {/* Base screen, nudged left as a pushed screen slides over it, like UINavigationController. */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              transform: `translateX(${-stack.push * DEVICE_W * 0.3}px)`,
            }}
          >
            {stack.base.kind === 'explore' && (
              <ExploreScreen screen={stack.base} theme={scene.theme} />
            )}
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
          <StatusBar />
        </div>
      </div>
    </div>
  );
};
