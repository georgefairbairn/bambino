/**
 * All timing and geometry for the ad. Pure functions only, so the whole
 * motion system is unit-testable without rendering a frame.
 *
 * The swipe constants mirror `constants/swipe.ts` so a card in the ad moves
 * the way a card in the app moves.
 */

export type Pose = 'enter' | 'idle' | 'lean' | 'recoil' | 'together';
export type Side = 'left' | 'right';

export interface PhoneTransform {
  translateX: number;
  translateY: number;
  /** Degrees. Positive turns the phone's right edge away from the viewer. */
  rotateY: number;
  /** Degrees, in-plane. */
  rotateZ: number;
  scale: number;
}

/** constants/swipe.ts — ROTATION_FACTOR. */
export const ROTATION_FACTOR = 0.08;
/** constants/swipe.ts — MAX_ROTATION. */
export const MAX_ROTATION = 12;
/** constants/swipe.ts — SWIPE_THRESHOLD. */
export const SWIPE_THRESHOLD = 120;
/** constants/swipe.ts — EXIT_X, for a 1080-wide composition. */
export const EXIT_X = 1180;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Eased 0..1 ramp. Matches the feel of the app's SPRING_CONFIG without a solver. */
const easeOutBack = (t: number): number => {
  const c = 1.7;
  const p = clamp(t, 0, 1) - 1;
  return 1 + (c + 1) * p * p * p + c * p * p;
};

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

const NEUTRAL: PhoneTransform = {
  translateX: 0,
  translateY: 0,
  rotateY: 0,
  rotateZ: 0,
  scale: 1,
};

export const getPhoneTransform = ({
  pose,
  localFrame,
  fps,
  side,
}: {
  pose: Pose;
  localFrame: number;
  fps: number;
  side: Side;
}): PhoneTransform => {
  // Positive means "toward the centre of the frame" for this side.
  const inward = side === 'left' ? 1 : -1;

  switch (pose) {
    case 'enter': {
      const t = easeOutBack(localFrame / (fps * 0.8));
      return {
        ...NEUTRAL,
        translateY: 1200 * (1 - t),
        rotateY: inward * 6 * t,
        scale: 0.9 + 0.1 * clamp(t, 0, 1),
      };
    }

    case 'idle': {
      // A 2-second sine drift so the phone breathes instead of freezing.
      const phase = (localFrame / (fps * 2)) * Math.PI * 2;
      return { ...NEUTRAL, rotateZ: 2 * Math.sin(phase) };
    }

    case 'lean': {
      const t = easeOutCubic(localFrame / (fps * 0.6));
      return { ...NEUTRAL, translateX: inward * 30 * t, rotateY: inward * 10 * t };
    }

    case 'recoil': {
      // Snap away over 6 frames, settle back over the next 12.
      const away = clamp(localFrame / 6, 0, 1);
      const back = easeOutCubic(clamp((localFrame - 6) / 12, 0, 1));
      const magnitude = away * (1 - back);
      return { ...NEUTRAL, rotateZ: -inward * 7 * magnitude };
    }

    case 'together': {
      const t = easeOutCubic(localFrame / (fps * 0.8));
      return { ...NEUTRAL, translateX: inward * 90 * t, rotateY: inward * 14 * t };
    }
  }
};

export interface CardTransform {
  translateX: number;
  rotateZ: number;
  likeOpacity: number;
  nopeOpacity: number;
}

/**
 * @param swipe Normalised swipe progress. -1 is fully rejected (off the left
 *   edge), 0 is at rest, 1 is fully liked (off the right edge).
 */
export const getCardTransform = (swipe: number): CardTransform => {
  const translateX = clamp(swipe, -1, 1) * EXIT_X;
  const rotateZ = clamp(translateX * ROTATION_FACTOR, -MAX_ROTATION, MAX_ROTATION);
  const stamp = clamp(Math.abs(translateX) / SWIPE_THRESHOLD, 0, 1);
  return {
    translateX,
    rotateZ,
    likeOpacity: translateX > 0 ? stamp : 0,
    nopeOpacity: translateX < 0 ? stamp : 0,
  };
};

/** Words per second for the headline reveal. */
const WORDS_PER_SECOND = 4;

export const getVisibleWordCount = ({
  totalWords,
  localFrame,
  fps,
}: {
  totalWords: number;
  localFrame: number;
  fps: number;
}): number => {
  if (localFrame < 0) return 0;
  const framesPerWord = fps / WORDS_PER_SECOND;
  return Math.min(totalWords, Math.floor(localFrame / framesPerWord) + 1);
};
