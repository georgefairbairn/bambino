import type React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { type Pose, type Side, getPhoneTransform } from '../motion';
import { AD_THEMES, type AdTheme, PHONE } from '../theme';
import { toCssTransform } from './phone-style';

/** Base body size in px, at scale 1. 9:19.5, matching an iPhone 15 Pro. */
export const PHONE_WIDTH = 420;
export const PHONE_HEIGHT = 910;

/**
 * Each phone carries its own perspective wrapper.
 *
 * CSS perspective only reaches an element's direct children, so setting it
 * once on an outer container is silently cancelled by any intermediate div
 * that lacks `preserve-3d`. That made rotateY do nothing and flattened the
 * lean, recoil and together poses into no visible movement at all.
 */
const PERSPECTIVE = 2200;

export const Phone: React.FC<{
  theme: AdTheme;
  pose: Pose;
  side: Side;
  /** Absolute frame the current pose started on. */
  poseStartFrame: number;
  /** Whether the phone is holding a turn toward its partner. */
  leaning?: boolean;
  scale: number;
  children?: React.ReactNode;
}> = ({ theme, pose, side, poseStartFrame, leaning = false, scale, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const transform = getPhoneTransform({
    pose,
    localFrame: frame - poseStartFrame,
    fps,
    side,
    leaning,
  });

  const screenBg = AD_THEMES[theme].screenBg;

  return (
    <div style={{ perspective: PERSPECTIVE, flexShrink: 0 }}>
    <div
      style={{
        width: PHONE_WIDTH,
        height: PHONE_HEIGHT,
        transform: `scale(${scale}) ${toCssTransform(transform)}`,
        transformStyle: 'preserve-3d',
        borderRadius: PHONE.borderRadius,
        backgroundColor: PHONE.bezel,
        border: `3px solid ${PHONE.frame}`,
        boxShadow: '0 40px 80px rgba(45, 27, 78, 0.18)',
        padding: PHONE.bezelWidth,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: PHONE.borderRadius - PHONE.bezelWidth,
          overflow: 'hidden',
          position: 'relative',
          background: `linear-gradient(160deg, ${screenBg[0]}, ${screenBg[1]}, ${screenBg[2]})`,
        }}
      >
        {children}
        {/* Dynamic island */}
        <div
          style={{
            position: 'absolute',
            top: 14,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 108,
            height: 30,
            borderRadius: 16,
            backgroundColor: PHONE.bezel,
          }}
        />
      </div>
    </div>
    </div>
  );
};
