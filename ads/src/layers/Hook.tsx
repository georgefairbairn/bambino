import type React from 'react';
import { useCurrentFrame } from 'remotion';
import { POPPINS } from '../fonts';
import { HEADLINE_COLOR, UNDERLINE_COLORS } from '../theme';

/**
 * The opening question, alone on the backdrop. Fully legible on frame 0,
 * because Instagram's autoplay thumbnail is frame 0. The pink underline under
 * "baby name?" is the card's own gender underline, drawn in.
 */
export const Hook: React.FC<{ lines: readonly string[]; fontSize: number; exit: number }> = ({
  lines,
  fontSize,
  exit,
}) => {
  const frame = useCurrentFrame();
  if (exit >= 1) return null;
  const underline = Math.min(1, Math.max(0, (frame - 8) / 16));
  const settle = Math.min(1, frame / 14);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 1 - exit,
        transform: `translateY(${-exit * 160}px) scale(${0.97 + 0.03 * settle})`,
      }}
    >
      {lines.map((line, i) => (
        <div
          key={line}
          style={{
            position: 'relative',
            fontFamily: POPPINS,
            fontWeight: 600,
            fontSize,
            lineHeight: 1.12,
            letterSpacing: -1,
            color: HEADLINE_COLOR,
            textAlign: 'center',
          }}
        >
          {line}
          {i === lines.length - 1 && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                bottom: fontSize * 0.02,
                height: fontSize * 0.11,
                width: `calc(${underline * 100}% - ${fontSize * 0.45}px)`,
                borderRadius: fontSize * 0.06,
                backgroundColor: UNDERLINE_COLORS.female,
                zIndex: -1,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
};
