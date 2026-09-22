import type React from 'react';
import { DEVICE_W } from '../device';
import { SANS } from '../fonts';

/** iPhone status bar: time, dynamic island, signal, wifi, battery. */
export const StatusBar: React.FC = () => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: DEVICE_W, height: 50, zIndex: 30 }}>
    <span
      style={{
        position: 'absolute',
        left: 34,
        top: 16,
        fontFamily: SANS,
        fontSize: 17,
        fontWeight: 600,
        color: '#000',
        letterSpacing: -0.3,
      }}
    >
      9:41
    </span>
    <div
      style={{
        position: 'absolute',
        left: (DEVICE_W - 124) / 2,
        top: 11,
        width: 124,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#000',
      }}
    />
    <svg style={{ position: 'absolute', right: 30, top: 19 }} width={68} height={13} viewBox="0 0 68 13">
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={i * 5} y={9 - i * 3} width={3} height={4 + i * 3} rx={1} fill="#000" />
      ))}
      <path d="M31 4.5a8 8 0 0 1 11 0M33.4 7a4.6 4.6 0 0 1 6.2 0" stroke="#000" strokeWidth={1.8} fill="none" strokeLinecap="round" />
      <circle cx={36.5} cy={10} r={1.4} fill="#000" />
      <rect x={45} y={0.5} width={21} height={12} rx={3.5} stroke="#000" strokeOpacity={0.4} fill="none" />
      <rect x={47} y={2.5} width={17} height={8} rx={2} fill="#000" />
      <rect x={66.5} y={4.5} width={1.5} height={4} rx={0.75} fill="#000" fillOpacity={0.4} />
    </svg>
  </div>
);
