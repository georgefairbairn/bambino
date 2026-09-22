import type React from 'react';
import { DEVICE_H, DEVICE_W } from '../device';

/** Deterministic PRNG so every render of a frame is identical. */
const mulberry32 = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const PALETTE = ['#FF8FAB', '#34D399', '#60A5FA', '#FBBF24', '#C4A7E7', '#FF5C8A'];

/** Each phone gets its own seed, so the two celebrations don't fall in lockstep. */
const makePieces = (seed: number) => {
  const rand = mulberry32(seed);
  return Array.from({ length: 46 }, () => ({
    x: rand() * DEVICE_W,
    delay: rand() * 0.25,
    speed: 0.75 + rand() * 0.6,
    drift: (rand() - 0.5) * 60,
    spin: (rand() - 0.5) * 720,
    w: 6 + rand() * 6,
    h: 10 + rand() * 8,
    color: PALETTE[Math.floor(rand() * PALETTE.length)]!,
  }));
};

const PIECES_BY_SEED = new Map<number, ReturnType<typeof makePieces>>();
const piecesFor = (seed: number) => {
  if (!PIECES_BY_SEED.has(seed)) PIECES_BY_SEED.set(seed, makePieces(seed));
  return PIECES_BY_SEED.get(seed)!;
};

/** Confetti falling across the phone screen, `progress` 0 → 1. */
export const Confetti: React.FC<{ progress: number; seed: number }> = ({ progress, seed }) => (
  <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 40 }}>
    {piecesFor(seed).map((p, i) => {
      const t = Math.max(0, (progress - p.delay) / (1 - p.delay));
      if (t <= 0) return null;
      const y = -30 + t * p.speed * (DEVICE_H * 0.9);
      const opacity = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;
      return (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: p.x + p.drift * t,
            top: y,
            width: p.w,
            height: p.h,
            borderRadius: 2,
            backgroundColor: p.color,
            opacity,
            transform: `rotate(${p.spin * t}deg)`,
          }}
        />
      );
    })}
  </div>
);
