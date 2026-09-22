import { describe, expect, it } from 'vitest';
import { DURATION_IN_FRAMES } from './compositions';
import {
  BEATS,
  HEADLINE_EXIT_FRAMES,
  HEADLINES,
  getBeat,
  getHeadline,
  getHeadlineStart,
  getOutgoingHeadline,
} from './timeline';

describe('timeline', () => {
  it('runs contiguously with no gaps or overlaps', () => {
    let expected = 0;
    for (const beat of BEATS) {
      expect(beat.from).toBe(expected);
      expect(beat.durationInFrames).toBeGreaterThan(0);
      expected = beat.from + beat.durationInFrames;
    }
  });

  it('covers exactly 20 seconds', () => {
    const last = BEATS[BEATS.length - 1]!;
    expect(last.from + last.durationInFrames).toBe(DURATION_IN_FRAMES);
    expect(DURATION_IN_FRAMES).toBe(600);
  });

  it('walks the six sections in the order George laid out', () => {
    const sections = BEATS.map((b) => b.section).filter((s, i, a) => a[i - 1] !== s);
    expect(sections).toEqual(['hook', 'swipe', 'match', 'filters', 'popularity', 'end']);
  });

  it('uses the approved headlines verbatim', () => {
    expect(HEADLINES).toEqual([
      'Trying to find the perfect baby name?',
      'Swipe through thousands of names',
      'The names you both like become matches',
      'Filter by style, origin or gender',
      'See how popular it really is',
    ]);
  });

  it('shows the hook question on frame 0, so the autoplay thumbnail reads', () => {
    expect(getHeadline(0)).toBe('Trying to find the perfect baby name?');
    expect(getHeadlineStart(0)).toBe(0);
  });

  it('gives every section after the hook its own headline', () => {
    expect(getHeadline(120)).toBe('Swipe through thousands of names');
    expect(getHeadline(300)).toBe('The names you both like become matches');
    expect(getHeadline(400)).toBe('Filter by style, origin or gender');
    expect(getHeadline(480)).toBe('See how popular it really is');
  });

  it('clears the headline slot for the end card', () => {
    expect(getHeadline(560)).toBeNull();
  });

  it('anchors a headline to the first beat that carries it, not the current one', () => {
    // The match headline spans five beats. Anchoring per beat re-typed it mid-line.
    expect(getHeadlineStart(180)).toBe(180);
    expect(getHeadlineStart(300)).toBe(180);
    expect(getHeadlineStart(340)).toBe(180);
  });

  it('lets a variant swap the copy without touching the beat table', () => {
    const variant = ['A', 'B', 'C', 'D', 'E'];
    expect(getHeadline(0, variant)).toBe('A');
    expect(getHeadline(480, variant)).toBe('E');
  });

  it('reports the outgoing headline briefly after each change, then nothing', () => {
    const out = getOutgoingHeadline(182);
    expect(out?.index).toBe(1);
    expect(out?.progress).toBeGreaterThan(0);
    expect(out?.progress).toBeLessThan(1);
    expect(getOutgoingHeadline(180 + HEADLINE_EXIT_FRAMES + 1)).toBeNull();
    expect(getOutgoingHeadline(150)).toBeNull();
  });

  it('lets the end card take over without a lingering headline exit', () => {
    expect(getOutgoingHeadline(527)?.index).toBe(4);
    expect(getOutgoingHeadline(560)).toBeNull();
  });

  it('never claims a rounded-up name count', () => {
    for (const h of HEADLINES) expect(h).not.toMatch(/30,?000/);
  });

  it('clamps out-of-range frames to the first and last beat', () => {
    expect(getBeat(-5).id).toBe('hook');
    expect(getBeat(99999).id).toBe('end');
  });
});
