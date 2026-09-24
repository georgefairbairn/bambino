import { describe, expect, it } from 'vitest';
import { FPS } from '../compositions';
import { getEndCardPhases } from '../end-card';
import { getLayout } from '../layout';
import { getHeadlineWordProgress } from '../motion';
import { getScene } from '../scene';
import { getBeat, getHeadlines } from '../timeline';
import { COMEBACKS, GRID, LISTS, RISING_BOYS, RISING_GIRLS, type NameList } from './data';

const ranks = (s: string) =>
  [...s.matchAll(/#([\d,]+)/g)].map((m) => Number(m[1]!.replace(/,/g, '')));

const frameSlides = GRID.flatMap((p) => (p.slides === 'reel' ? [] : p.slides)).filter(
  (s): s is Extract<typeof s, { kind: 'frame' }> => s.kind === 'frame',
);

describe('posts grid', () => {
  it('fills three full rows of the profile grid', () => {
    expect(GRID).toHaveLength(9);
    expect(new Set(GRID.map((p) => p.slug)).size).toBe(GRID.length);
  });

  it("keeps every carousel within Instagram's ten-slide limit", () => {
    for (const p of GRID) if (p.slides !== 'reel') expect(p.slides.length).toBeLessThanOrEqual(10);
  });

  it('only uses ad frames where the headline has finished popping in', () => {
    for (const s of frameSlides) {
      const index = getBeat(s.frame).headlineIndex;
      if (index === null || index === 0) continue; // The hook and the end card carry no slot headline.
      const words = getHeadlines(s.hook)[index]!.split(' ').length;
      expect(getHeadlineWordProgress(s.frame, FPS, words).every((t) => t === 1)).toBe(true);
    }
  });

  it('catches every visible card at rest, never mid-swipe', () => {
    const layout = getLayout('feed');
    for (const s of frameSlides) {
      for (const phone of getScene(s.frame, layout).phones) {
        const { base, pushed, sheetProgress } = phone.stack;
        if (base.kind !== 'explore' || pushed || sheetProgress > 0 || !base.front) continue;
        expect(base.front.x).toBe(0);
      }
    }
  });

  it('shows the finished end card, badge included, on the download slide', () => {
    const phases = getEndCardPhases(getScene(599, getLayout('feed')).endCard);
    expect(phases).toMatchObject({ icon: 1, tagline: 1, badge: 1, collapse: 1 });
  });
});

describe('name lists', () => {
  const each = (fn: (list: NameList) => void) => Object.values(LISTS).forEach(fn);

  it('lists ten different names each', () => {
    each((list) => {
      expect(list.rows).toHaveLength(10);
      expect(new Set(list.rows.map((r) => r.name)).size).toBe(10);
    });
  });

  it('orders the rising lists by places climbed, and the figure matches the ranks', () => {
    for (const list of [RISING_GIRLS, RISING_BOYS]) {
      const climbs = list.rows.map((r) => {
        const [then, now] = ranks(r.note);
        expect(now!).toBeLessThanOrEqual(200);
        expect(Number(r.stat.replace(/[^\d]/g, ''))).toBe(then! - now!);
        return then! - now!;
      });
      expect(climbs).toEqual([...climbs].sort((a, b) => b - a));
    }
  });

  it('only calls a name a comeback if it was top 100, fell below 400 and is top 100 again', () => {
    const now = COMEBACKS.rows.map((r) => {
      const [in1920, low] = ranks(r.note);
      const [latest] = ranks(r.stat);
      expect(in1920!).toBeLessThanOrEqual(100);
      expect(low!).toBeGreaterThan(400);
      expect(latest!).toBeLessThanOrEqual(100);
      return latest!;
    });
    expect(now).toEqual([...now].sort((a, b) => a - b));
  });

  it('never claims more recent data than the app has (2023)', () => {
    each((list) => {
      for (const text of [list.subtitle, ...list.rows.flatMap((r) => [r.stat, r.note])]) {
        expect(text).not.toMatch(/today|20(2[4-9])/);
      }
    });
  });
});
