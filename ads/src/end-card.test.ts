import { describe, expect, it } from 'vitest';
import { END_CARD_FRAMES, getEndCardPhases } from './end-card';

const at = (frame: number) => getEndCardPhases(frame / END_CARD_FRAMES);

describe('getEndCardPhases', () => {
  it('starts empty', () => {
    const p = getEndCardPhases(0);
    expect(p.wordmark).toBe(0);
    expect(p.tagline).toBe(0);
    expect(p.collapse).toBe(0);
    expect(p.icon).toBe(0);
  });

  it('shows the full wordmark, still uncollapsed, before anything folds', () => {
    // George: "bambino" first, then collapse down to the app icon.
    const p = at(16);
    expect(p.wordmark).toBe(1);
    expect(p.collapse).toBe(0);
    expect(p.icon).toBe(0);
  });

  it('holds the wordmark long enough to read', () => {
    const readable = Array.from({ length: END_CARD_FRAMES }, (_, f) => at(f)).filter(
      (p) => p.wordmark === 1 && p.collapse === 0,
    );
    expect(readable.length).toBeGreaterThanOrEqual(8);
  });

  it('grows the icon behind the b as the other letters fold away', () => {
    const mid = at(33);
    expect(mid.collapse).toBeGreaterThan(0);
    expect(mid.collapse).toBeLessThan(1);
    expect(mid.icon).toBeGreaterThan(0);
  });

  it('ends on the finished icon, held for most of a second', () => {
    const held = Array.from({ length: END_CARD_FRAMES }, (_, f) => at(f)).filter(
      (p) => p.collapse === 1 && p.icon === 1,
    );
    expect(held.length).toBeGreaterThanOrEqual(20);
    expect(at(END_CARD_FRAMES).collapse).toBe(1);
  });

  it('keeps the download line up from early on, so it reads for over a second', () => {
    const shown = Array.from({ length: END_CARD_FRAMES }, (_, f) => at(f)).filter((p) => p.tagline === 1);
    expect(shown.length).toBeGreaterThanOrEqual(36);
  });

  it('never runs backwards', () => {
    let last = getEndCardPhases(0);
    for (let f = 1; f <= END_CARD_FRAMES; f++) {
      const p = at(f);
      expect(p.collapse).toBeGreaterThanOrEqual(last.collapse);
      expect(p.wordmark).toBeGreaterThanOrEqual(last.wordmark);
      last = p;
    }
  });
});
