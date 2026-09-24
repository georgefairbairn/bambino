import { describe, expect, it } from 'vitest';
import { DURATION_IN_FRAMES } from './compositions';
import {
  BEATS,
  DEFAULT_HOOK,
  HEADLINE_EXIT_FRAMES,
  HEADLINES,
  HOOK_IDS,
  HOOKS,
  getBeat,
  getHeadline,
  getHeadlines,
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

  it('uses the approved headlines verbatim after the hook', () => {
    expect(HEADLINES.slice(1)).toEqual([
      'Swipe through thousands of names',
      'Link up with your partner',
      'The names you both like become matches',
      'Filter by style, origin or gender',
      'See how popular it really is',
    ]);
  });

  it('tests the two hooks George picked, with the plain question as the default', () => {
    expect(getHeadlines('looking')[0]).toBe('Looking for a baby name?');
    expect(getHeadlines('cant-agree')[0]).toBe('Can’t agree on a baby name?');
    expect(HEADLINES).toEqual(getHeadlines(DEFAULT_HOOK));
    expect(DEFAULT_HOOK).toBe('looking');
  });

  it('ends every hook on "baby name?" alone, so the underline sits under it', () => {
    for (const id of HOOK_IDS) expect(HOOKS[id].at(-1)).toBe('baby name?');
  });

  it('shows the hook question on frame 0, so the autoplay thumbnail reads', () => {
    for (const id of HOOK_IDS) {
      expect(getHeadline(0, getHeadlines(id))).toBe(HOOKS[id].join(' '));
    }
    expect(getHeadlineStart(0)).toBe(0);
  });

  it('gives every section after the hook its own headline', () => {
    expect(getHeadline(120)).toBe('Swipe through thousands of names');
    expect(getHeadline(300)).toBe('The names you both like become matches');
    expect(getHeadline(400)).toBe('Filter by style, origin or gender');
    expect(getHeadline(480)).toBe('See how popular it really is');
  });

  it('says you can link with your partner as their phone arrives, before the match line', () => {
    // George: specify that you link with your partner before
    // "The names you both like become matches". Reuses the App Store headline.
    expect(getHeadline(185)).toBe('Link up with your partner');
    expect(getHeadline(250)).toBe('Link up with your partner');
    expect(getHeadlineStart(250)).toBe(180);
  });

  it('lands the match line as both phones settle on the same name', () => {
    expect(getBeat(265).id).toBe('stillness');
    expect(getHeadline(265)).toBe('The names you both like become matches');
  });

  it('clears the headline slot for the end card', () => {
    expect(getHeadline(560)).toBeNull();
  });

  it('anchors a headline to the first beat that carries it, not the current one', () => {
    // The match headline spans three beats. Anchoring per beat re-typed it mid-line.
    expect(getHeadlineStart(265)).toBe(265);
    expect(getHeadlineStart(300)).toBe(265);
    expect(getHeadlineStart(340)).toBe(265);
  });

  it('lets a variant swap the copy without touching the beat table', () => {
    const variant = ['A', 'B', 'C', 'D', 'E', 'F'];
    expect(getHeadline(0, variant)).toBe('A');
    expect(getHeadline(480, variant)).toBe('F');
  });

  it('reports the outgoing headline briefly after each change, then nothing', () => {
    const out = getOutgoingHeadline(182);
    expect(out?.index).toBe(1);
    expect(out?.progress).toBeGreaterThan(0);
    expect(out?.progress).toBeLessThan(1);
    expect(getOutgoingHeadline(180 + HEADLINE_EXIT_FRAMES + 1)).toBeNull();
    expect(getOutgoingHeadline(150)).toBeNull();
  });

  it('hands the partner line over to the match line', () => {
    expect(getOutgoingHeadline(267)?.index).toBe(2);
  });

  it('lets the end card take over without a lingering headline exit', () => {
    expect(getOutgoingHeadline(520)?.index).toBe(5);
    expect(getOutgoingHeadline(560)).toBeNull();
  });

  it('gives the end card at least two and a half seconds', () => {
    const end = BEATS.find((b) => b.id === 'end')!;
    expect(end.durationInFrames).toBeGreaterThanOrEqual(75);
  });

  it('never claims a rounded-up name count', () => {
    for (const h of HEADLINES) expect(h).not.toMatch(/30,?000/);
  });

  it('clamps out-of-range frames to the first and last beat', () => {
    expect(getBeat(-5).id).toBe('hook');
    expect(getBeat(99999).id).toBe('end');
  });
});
