import { type AdName, CAST, type Cast } from './names';
import { type Pose, type Side } from './motion';
import { getBeat } from './timeline';

export interface PhoneState {
  visible: boolean;
  pose: Pose;
  /** Absolute frame the current pose began on. */
  poseStartFrame: number;
  card: AdName | null;
  /** -1 rejected, 0 at rest, 1 liked. */
  swipe: number;
  /** True once the partner is on screen and the phones turn toward each other. */
  leaning: boolean;
}

/** One swipe cycle: 30 frames at rest, then 15 frames carrying the card off. */
const SWIPE_CYCLE = 45;
const SWIPE_HOLD = 30;

const swipeProgress = (localFrame: number, direction: -1 | 1): number => {
  const phase = localFrame % SWIPE_CYCLE;
  if (phase < SWIPE_HOLD) return 0;
  return direction * ((phase - SWIPE_HOLD) / (SWIPE_CYCLE - SWIPE_HOLD));
};

/** Cards the mint phone works through during its solo run. */
const soloSequence = (cast: Cast): { card: AdName; direction: -1 | 1 }[] => [
  { card: cast.olivia, direction: -1 },
  { card: cast.otto, direction: -1 },
  { card: cast.juniper, direction: 1 },
];

export const getPhoneState = ({
  frame,
  side,
  cast = CAST,
}: {
  frame: number;
  side: Side;
  cast?: Cast;
}): PhoneState => {
  const beat = getBeat(frame);
  const SOLO_SEQUENCE = soloSequence(cast);
  const hidden: PhoneState = {
    visible: false,
    pose: 'idle',
    poseStartFrame: beat.from,
    card: null,
    swipe: 0,
    leaning: false,
  };

  switch (beat.id) {
    case 'card-fan':
      return hidden;

    case 'phone-enter':
      if (side === 'right') return hidden;
      return {
        visible: true,
        pose: 'enter',
        poseStartFrame: 60,
        card: cast.olivia,
        swipe: 0,
        leaning: false,
      };

    case 'solo-swipes': {
      if (side === 'right') return hidden;
      const local = frame - 90;
      const index = Math.min(SOLO_SEQUENCE.length - 1, Math.floor(local / SWIPE_CYCLE));
      const step = SOLO_SEQUENCE[index]!;
      const swipe = swipeProgress(local, step.direction);
      return {
        visible: true,
        pose: swipe < 0 ? 'recoil' : 'idle',
        poseStartFrame: 90 + index * SWIPE_CYCLE + SWIPE_HOLD,
        card: step.card,
        swipe,
        leaning: false,
      };
    }

    case 'partner-join':
      return {
        visible: true,
        pose: side === 'right' ? 'enter' : 'lean',
        poseStartFrame: 180,
        card: cast.juniper,
        swipe: 0,
        // The left phone is mid-lean here; the right one leans as it enters.
        leaning: side === 'right',
      };

    case 'out-of-sync': {
      const local = frame - 210;
      // Both phones land on Wren in the middle of this beat and disagree.
      const onWren = local >= SWIPE_CYCLE && local < SWIPE_CYCLE * 2;
      const direction: -1 | 1 = onWren ? (side === 'left' ? -1 : 1) : side === 'left' ? 1 : -1;
      const card = onWren ? cast.wren : side === 'left' ? cast.otto : cast.olivia;
      const swipe = swipeProgress(local, direction);
      return {
        visible: true,
        pose: swipe < 0 ? 'recoil' : 'idle',
        poseStartFrame: 210 + Math.floor(local / SWIPE_CYCLE) * SWIPE_CYCLE + SWIPE_HOLD,
        card,
        swipe,
        leaning: true,
      };
    }

    case 'stillness':
      return {
        visible: true,
        pose: 'idle',
        poseStartFrame: 300,
        card: cast.esme,
        swipe: 0,
        leaning: true,
      };

    case 'match-fuse': {
      const local = frame - 330;
      return {
        visible: true,
        // 'idle' plus a held lean, not the 'lean' pose: they are already
        // leaning by this point and re-running the ramp would double it.
        pose: 'idle',
        poseStartFrame: 330,
        card: cast.esme,
        swipe: Math.min(1, local / 20),
        leaning: true,
      };
    }

    case 'together':
      return {
        visible: true,
        pose: 'together',
        poseStartFrame: 360,
        card: null,
        swipe: 0,
        leaning: true,
      };

    case 'end-card':
      return hidden;
  }
};
