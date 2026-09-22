import { describe, expect, it } from 'vitest';
import { invertRanks, plotSeries, smoothPath } from './curves';

describe('plotSeries', () => {
  it('spans the box and draws higher values higher', () => {
    const pts = plotSeries([0, 10], 100, 50, 1);
    expect(pts[0]).toEqual({ x: 1, y: 49 });
    expect(pts[1]).toEqual({ x: 99, y: 1 });
  });

  it('draws a flat series without dividing by zero', () => {
    const pts = plotSeries([5, 5, 5], 80, 28, 1);
    for (const p of pts) expect(Number.isFinite(p.y)).toBe(true);
  });
});

describe('smoothPath', () => {
  it('starts at the first point and ends at the last', () => {
    const d = smoothPath([{ x: 0, y: 0 }, { x: 10, y: 5 }, { x: 20, y: 0 }]);
    expect(d.startsWith('M0,0')).toBe(true);
    expect(d.endsWith(' 20,0')).toBe(true);
    expect(d.match(/ C/g)).toHaveLength(2);
  });

  it('draws nothing for an empty series', () => {
    expect(smoothPath([])).toBe('');
  });
});

describe('invertRanks', () => {
  it('turns a climbing rank into a rising line', () => {
    const esme = invertRanks([812, 680, 325]);
    expect(esme[2]).toBeGreaterThan(esme[0]!);
    expect(esme[0]).toBe(1);
  });
});
