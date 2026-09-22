import { describe, expect, it } from 'vitest';
import { getVisibleWordCount } from './motion';

const FPS = 30;

describe('getVisibleWordCount', () => {
  it('shows nothing before the reveal starts', () => {
    expect(getVisibleWordCount({ totalWords: 3, localFrame: -1, fps: FPS })).toBe(0);
  });

  it('shows the first word immediately', () => {
    expect(getVisibleWordCount({ totalWords: 3, localFrame: 0, fps: FPS })).toBe(1);
  });

  it('adds words over time', () => {
    const early = getVisibleWordCount({ totalWords: 6, localFrame: 5, fps: FPS });
    const later = getVisibleWordCount({ totalWords: 6, localFrame: 25, fps: FPS });
    expect(later).toBeGreaterThan(early);
  });

  it('finishes the longest headline within one second', () => {
    const words = 'The names you both like become matches'.split(' ').length;
    expect(getVisibleWordCount({ totalWords: words, localFrame: 30, fps: FPS })).toBe(words);
  });

  it('never exceeds the word count', () => {
    expect(getVisibleWordCount({ totalWords: 3, localFrame: 900, fps: FPS })).toBe(3);
  });
});
