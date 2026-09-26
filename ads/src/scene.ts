/**
 * What is on screen on every frame, as plain data. Components only draw what
 * this returns, so the whole storyboard is unit-testable without rendering.
 */
import { getSwipeX } from './card-visuals';
import { DURATION_IN_FRAMES } from './compositions';
import { END_CARD_START } from './end-card';
import {
  CELEBRITY_INDEX,
  FILTERS,
  FILTERS_PILL,
  categoryRowY,
  filtersScrollFor,
  sheetScrollFor,
  switchCentre,
} from './geometry';
import { type AdLayout } from './layout';
import { getPhoneDrift, SWAY_PERIOD } from './motion';
import { type AdName, CAST, type Cast, NAMES_AVAILABLE } from './names';
import { type AdTheme } from './theme';

type Ease = (t: number) => number;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
export const easeInOutCubic: Ease = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOutCubic: Ease = (t) => 1 - Math.pow(1 - t, 3);
export const easeInCubic: Ease = (t) => t * t * t;

/** [frame, value, ease for the segment that ends here]. */
export type Key = readonly [number, number, Ease?];

export const keyframes = (keys: readonly Key[], frame: number): number => {
  const first = keys[0]!;
  if (frame <= first[0]) return first[1];
  for (let i = 1; i < keys.length; i++) {
    const [f1, v1, ease = easeInOutCubic] = keys[i]!;
    const [f0, v0] = keys[i - 1]!;
    if (frame <= f1) return v0 + (v1 - v0) * ease(clamp01((frame - f0) / (f1 - f0)));
  }
  return keys[keys.length - 1]![1];
};

export interface CardView {
  name: AdName;
  /** Horizontal offset in points; negative is a reject. */
  x: number;
}

export type Screen =
  | {
      kind: 'explore';
      front: CardView | null;
      back: AdName | null;
      likedCount: number;
      /** The name both partners like, celebrated when `celebration` runs. */
      matched: AdName;
      /** 0 → 1 as the It's a Match card comes in. */
      celebration: number;
    }
  | {
      kind: 'filters';
      allSwitch: number;
      celebritySwitch: number;
      count: number;
      filtersApplied: boolean;
      /** Scroll offset of the list, in points. */
      scroll: number;
    }
  | {
      kind: 'detail';
      chart: number;
      tooltip: number;
      /** Scroll offset of the sheet content, in points. */
      scroll: number;
    };

export interface ScreenStack {
  base: Screen;
  /** A screen pushed from the right, as the Filters pill does. */
  pushed: Screen | null;
  push: number;
  /** A bottom sheet sliding up, as the popularity detail does. */
  sheet: Screen | null;
  sheetProgress: number;
}

/** A finger tap, in the phone's screen points. */
export interface Tap {
  x: number;
  y: number;
  progress: number;
}

export interface PhoneScene {
  id: 'A' | 'B';
  theme: AdTheme;
  /** Sideways offset from centre in px: a slow sway plus a lean toward each swipe. */
  x: number;
  /** Top edge of the phone in px. */
  y: number;
  /** Pixels per app point this frame. */
  scale: number;
  stack: ScreenStack;
  tap: Tap | null;
  /** 0 → 1 across the confetti fall, or null when there is none. */
  confetti: number | null;
}

export interface Scene {
  phones: PhoneScene[];
  /** 0 → 1 as the hook question clears. */
  hookExit: number;
  /** 0 → 1 linearly across the end card; EndCard maps this to its phases. */
  endCard: number;
}

interface Deal {
  key: keyof Cast;
  /** First and last frame of the swipe. */
  swipe: readonly [number, number];
  direction: -1 | 1;
}

/** Mint phone: bins Olivia and Otto, keeps Juniper, bins Wren, keeps Esme. */
const DEALS_A: readonly Deal[] = [
  { key: 'olivia', swipe: [104, 116], direction: -1 },
  { key: 'otto', swipe: [128, 140], direction: -1 },
  { key: 'juniper', swipe: [152, 164], direction: 1 },
  { key: 'wren', swipe: [214, 226], direction: -1 },
  { key: 'esme', swipe: [290, 302], direction: 1 },
];

/** Blue phone: keeps Wren after mint has already binned it, then keeps Esme. */
const DEALS_B: readonly Deal[] = [
  { key: 'wren', swipe: [232, 244], direction: 1 },
  { key: 'esme', swipe: [290, 302], direction: 1 },
];

const exploreAt = (
  frame: number,
  deals: readonly Deal[],
  cast: Cast,
  startLikes: number,
): Screen => {
  const index = deals.findIndex((d) => frame < d.swipe[1]);
  const current = index === -1 ? null : deals[index]!;
  const next = index === -1 ? null : (deals[index + 1] ?? null);
  const likes = startLikes + deals.filter((d) => d.direction === 1 && frame >= d.swipe[1]).length;

  let front: CardView | null = null;
  if (current) {
    const t = (frame - current.swipe[0]) / (current.swipe[1] - current.swipe[0]);
    front = {
      name: cast[current.key],
      x: frame < current.swipe[0] ? 0 : getSwipeX(t, current.direction),
    };
  }
  return {
    kind: 'explore',
    front,
    back: next ? cast[next.key] : null,
    likedCount: likes,
    matched: cast.esme,
    celebration: keyframes(
      [
        [305, 0],
        [323, 1, easeOutCubic],
      ],
      frame,
    ),
  };
};

const tapAt = (frame: number, start: number, x: number, y: number): Tap | null => {
  const t = (frame - start) / 10;
  return t < 0 || t > 1 ? null : { x, y, progress: t };
};

export const getScene = (frame: number, layout: AdLayout, cast: Cast = CAST): Scene => {
  const { slots, slotX } = layout;
  const visiblePoints = (layout.height - slots.solo) / layout.phoneScale;
  const scroll = filtersScrollFor(visiblePoints);

  // --- Mint phone ---------------------------------------------------------
  const yA = keyframes(
    [
      [75, slots.hidden],
      [97, slots.solo, easeOutCubic],
      [180, slots.solo],
      [200, slots.top],
      [345, slots.top],
      [365, slots.solo],
      [518, slots.solo],
      [END_CARD_START, slots.hidden, easeInCubic],
    ],
    frame,
  );

  const allSwitch = keyframes(
    [
      [388, 1],
      [394, 0],
    ],
    frame,
  );
  const celebritySwitch = keyframes(
    [
      [388, 1],
      [394, 0],
      [402, 0],
      [408, 1],
    ],
    frame,
  );
  const count = Math.round(
    keyframes(
      [
        [408, NAMES_AVAILABLE.all],
        [424, NAMES_AVAILABLE.celebrity, easeOutCubic],
      ],
      frame,
    ),
  );

  const allCentre = switchCentre(FILTERS.allRow.y, FILTERS.allRow.h);
  const celebrityCentre = switchCentre(categoryRowY(CELEBRITY_INDEX), FILTERS.rowH);
  const listTop = FILTERS.scrollTop - scroll;

  const tapA =
    tapAt(frame, 352, FILTERS_PILL.x + FILTERS_PILL.w / 2, FILTERS_PILL.y + FILTERS_PILL.h / 2) ??
    tapAt(frame, 384, allCentre.x, listTop + allCentre.y) ??
    tapAt(frame, 398, celebrityCentre.x, listTop + celebrityCentre.y);

  const scaleA = keyframes(
    [
      [180, layout.phoneScale],
      [200, layout.matchScale],
      [345, layout.matchScale],
      [365, layout.phoneScale],
    ],
    frame,
  );

  const phoneA: PhoneScene = {
    id: 'A',
    theme: 'mint',
    x:
      keyframes(
        [
          [180, slotX.solo],
          [200, slotX.top],
          [345, slotX.top],
          [365, slotX.solo],
        ],
        frame,
      ) + getPhoneDrift(frame, DEALS_A),
    y: yA,
    scale: scaleA,
    stack: {
      base: exploreAt(frame, DEALS_A, cast, 2),
      pushed:
        frame >= 362
          ? {
              kind: 'filters',
              allSwitch,
              celebritySwitch,
              count,
              filtersApplied: frame >= 394,
              scroll,
            }
          : null,
      push: keyframes(
        [
          [362, 0],
          [374, 1, easeOutCubic],
        ],
        frame,
      ),
      sheet:
        frame >= 435
          ? {
              kind: 'detail',
              chart: keyframes(
                [
                  [452, 0],
                  [490, 1, easeInOutCubic],
                ],
                frame,
              ),
              tooltip: keyframes(
                [
                  [490, 0],
                  [497, 1, easeOutCubic],
                ],
                frame,
              ),
              scroll: sheetScrollFor(visiblePoints),
            }
          : null,
      sheetProgress: keyframes(
        [
          [435, 0],
          [450, 1, easeOutCubic],
        ],
        frame,
      ),
    },
    tap: tapA,
    confetti: frame >= 305 && frame < 350 ? (frame - 305) / 45 : null,
  };

  // --- Blue partner phone -------------------------------------------------
  const yB = keyframes(
    [
      [180, slots.hidden],
      [202, slots.bottom, easeOutCubic],
      [345, slots.bottom],
      [362, slots.hidden, easeInCubic],
    ],
    frame,
  );

  const phoneB: PhoneScene = {
    id: 'B',
    theme: 'blue',
    // Half a sway out of step with A, so the pair never moves in lockstep.
    x: slotX.bottom + getPhoneDrift(frame, DEALS_B, SWAY_PERIOD / 2),
    y: yB,
    scale: layout.matchScale,
    stack: {
      base: exploreAt(frame, DEALS_B, cast, 4),
      pushed: null,
      push: 0,
      sheet: null,
      sheetProgress: 0,
    },
    tap: null,
    confetti: frame >= 305 && frame < 350 ? (frame - 305) / 45 : null,
  };

  return {
    phones: [phoneA, phoneB],
    hookExit: keyframes(
      [
        [72, 0],
        [90, 1, easeInCubic],
      ],
      frame,
    ),
    // Starts the frame the phone clears (an ease-in exit lingers, and an
    // earlier start drew the logo over the popularity sheet). Linear, because
    // EndCard sequences its own phases: wordmark, collapse into the icon.
    endCard: keyframes(
      [
        [END_CARD_START, 0],
        [DURATION_IN_FRAMES, 1, (t) => t],
      ],
      frame,
    ),
  };
};
