import type React from 'react';

const OFF = [0xe5, 0xdd, 0xd0];

const hexToRgb = (hex: string): number[] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

/**
 * An iOS UISwitch at its native 51×31pt. `value` runs 0 → 1 so the thumb can
 * travel. Track colours are the app's: '#E5DDD0' off, the theme primary on.
 */
export const Switch: React.FC<{ value: number; onColor: string }> = ({ value, onColor }) => {
  const on = hexToRgb(onColor);
  const mix = OFF.map((c, i) => Math.round(c + (on[i]! - c) * value));
  return (
    <div
      style={{
        position: 'relative',
        width: 51,
        height: 31,
        borderRadius: 16,
        backgroundColor: `rgb(${mix.join(',')})`,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 2,
          left: 2 + 20 * value,
          width: 27,
          height: 27,
          borderRadius: 14,
          backgroundColor: '#FFFFFF',
          boxShadow: '0 3px 8px rgba(0,0,0,0.15), 0 1px 1px rgba(0,0,0,0.16)',
        }}
      />
    </div>
  );
};
