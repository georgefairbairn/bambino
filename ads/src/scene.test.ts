import { describe, expect, it } from 'vitest';
import { AD_FORMATS, DURATION_IN_FRAMES } from './compositions';
import { PHONE_W } from './device';
import { getLayout } from './layout';
import { CAST, NAMES_AVAILABLE } from './names';
import { type PhoneScene, getScene, keyframes } from './scene';

const layout = getLayout('reel');
const at = (frame: number) => getScene(frame, layout);
const phone = (frame: number, id: 'A' | 'B'): PhoneScene | undefined =>
  at(frame).phones.find((p) => p.id === id);
const visible = (frame: number, id: 'A' | 'B') => {
  const p = phone(frame, id);
  return p !== undefined && p.y < layout.height;
};
const explore = (frame: number, id: 'A' | 'B') => {
  const s = phone(frame, id)!.stack.base;
  if (s.kind !== 'explore') throw new Error('expected explore');
  return s;
};

describe('scene — 15s split', () => {
  const short = (frame: number, format: 'reel' | 'feed' | 'square' | 'landscape' = 'reel') =>
    getScene(frame, getLayout(format), CAST, { pace: 'short' });

  it('matches the full cut up to the split', () => {
    for (const f of [0, 100, 250, 344]) {
      expect(short(f)).toEqual(getScene(f, layout, CAST, { pace: 'full' }));
    }
  });

  it('keeps both phones side by side, apart and inside the frame', () => {
    for (const format of AD_FORMATS) {
      const l = getLayout(format);
      const [a, b] = short(400, format).phones;
      const half = (PHONE_W * a!.scale) / 2;
      const left = (p: PhoneScene) => l.width / 2 + p.x - half;
      expect(a!.y).toBe(b!.y);
      expect(left(a!)).toBeGreaterThan(0);
      expect(left(b!)).toBeGreaterThan(left(a!) + 2 * half);
      expect(left(b!) + 2 * half).toBeLessThan(l.width);
    }
  });

  it('shows mint on Filters with Celebrity picked, blue on the chart', () => {
    const [a, b] = short(420).phones;
    const filters = a!.stack.pushed;
    const detail = b!.stack.sheet;
    if (filters?.kind !== 'filters' || detail?.kind !== 'detail') throw new Error();
    expect(filters.celebritySwitch).toBe(1);
    expect(filters.count).toBe(NAMES_AVAILABLE.celebrity);
    expect(detail.chart).toBe(1);
    expect(b!.stack.sheetProgress).toBe(1);
  });

  it('clears both phones by the end card', () => {
    const late = short(560);
    for (const p of late.phones) expect(p.y).toBeGreaterThanOrEqual(layout.height);
    expect(late.endCard).toBeGreaterThan(0);
  });
});

describe('keyframes', () => {
  it('holds the first and last values outside the keyed range', () => {
    const keys = [
      [10, 0],
      [20, 100],
    ] as const;
    expect(keyframes(keys, 0)).toBe(0);
    expect(keyframes(keys, 30)).toBe(100);
  });

  it('eases between keys and hits them exactly', () => {
    const keys = [
      [10, 0],
      [20, 100],
    ] as const;
    expect(keyframes(keys, 10)).toBe(0);
    expect(keyframes(keys, 20)).toBe(100);
    expect(keyframes(keys, 15)).toBeCloseTo(50, 0);
  });
});

describe('scene — hook', () => {
  it('opens on text alone: no phone on screen for the first frames', () => {
    expect(visible(0, 'A')).toBe(false);
    expect(visible(0, 'B')).toBe(false);
    expect(at(0).hookExit).toBe(0);
  });

  it('clears the hook as the first phone arrives', () => {
    expect(at(100).hookExit).toBe(1);
  });
});

describe('scene — swipe', () => {
  it('raises one mint phone, alone', () => {
    expect(visible(100, 'A')).toBe(true);
    expect(visible(100, 'B')).toBe(false);
    expect(phone(100, 'A')!.theme).toBe('mint');
  });

  it('bins Olivia then Otto, then keeps Juniper', () => {
    expect(explore(100, 'A').front?.name.name).toBe('Olivia');
    expect(explore(110, 'A').front!.x).toBeLessThan(0);
    expect(explore(120, 'A').front?.name.name).toBe('Otto');
    expect(explore(134, 'A').front!.x).toBeLessThan(0);
    expect(explore(145, 'A').front?.name.name).toBe('Juniper');
    expect(explore(158, 'A').front!.x).toBeGreaterThan(0);
  });

  it('shows the next card peeking behind the one being swiped', () => {
    expect(explore(110, 'A').back?.name).toBe('Otto');
  });

  it('counts the like on Juniper in the header', () => {
    expect(explore(150, 'A').likedCount).toBe(2);
    expect(explore(170, 'A').likedCount).toBe(3);
  });
});

describe('scene — match', () => {
  it('brings a blue partner phone up beneath the first', () => {
    expect(visible(210, 'B')).toBe(true);
    expect(phone(210, 'B')!.theme).toBe('blue');
    expect(phone(210, 'B')!.y).toBeGreaterThan(phone(210, 'A')!.y);
  });

  it('splits them on Wren: mint bins it while blue is still deciding', () => {
    const disagreement = Array.from({ length: 60 }, (_, i) => 205 + i).some((f) => {
      const a = explore(f, 'A').front;
      const b = explore(f, 'B').front;
      return a?.name.name === 'Wren' && b?.name.name === 'Wren' && a.x < 0 && b.x === 0;
    });
    expect(disagreement).toBe(true);
  });

  it('has blue keep Wren after mint has already moved on', () => {
    expect(explore(238, 'B').front?.name.name).toBe('Wren');
    expect(explore(238, 'B').front!.x).toBeGreaterThan(0);
    expect(explore(238, 'A').front?.name.name).toBe('Esme');
  });

  it('holds both phones on Esme, at rest, through the stillness', () => {
    for (let f = 265; f < 290; f++) {
      for (const id of ['A', 'B'] as const) {
        expect(explore(f, id).front?.name.name).toBe('Esme');
        expect(explore(f, id).front!.x).toBe(0);
      }
    }
  });

  it('swipes Esme right on both phones in the same frames', () => {
    const a = explore(296, 'A').front!;
    const b = explore(296, 'B').front!;
    expect(a.x).toBeGreaterThan(0);
    expect(a.x).toBeCloseTo(b.x, 5);
  });

  it("shows the app's It's a Match celebration on both phones at once", () => {
    expect(explore(300, 'A').celebration).toBe(0);
    expect(explore(330, 'A').celebration).toBe(1);
    expect(explore(330, 'B').celebration).toBe(1);
    expect(phone(320, 'A')!.confetti).not.toBeNull();
    expect(phone(320, 'B')!.confetti).not.toBeNull();
  });
});

describe('scene — filters', () => {
  it('drops the partner phone and keeps the mint one', () => {
    expect(visible(380, 'B')).toBe(false);
    expect(visible(380, 'A')).toBe(true);
  });

  it('taps the Filters pill and pushes the filters screen', () => {
    expect(phone(357, 'A')!.tap).not.toBeNull();
    expect(phone(380, 'A')!.stack.push).toBe(1);
    expect(phone(380, 'A')!.stack.pushed?.kind).toBe('filters');
  });

  it('starts with every category on and all names available', () => {
    const f = phone(380, 'A')!.stack.pushed!;
    if (f.kind !== 'filters') throw new Error();
    expect(f.allSwitch).toBe(1);
    expect(f.count).toBe(NAMES_AVAILABLE.all);
    expect(f.filtersApplied).toBe(false);
  });

  it('switches All Categories off, then Celebrity on, as the app requires', () => {
    // With All on, tapping Celebrity would turn it OFF (select-all-except).
    const mid = phone(396, 'A')!.stack.pushed!;
    const end = phone(430, 'A')!.stack.pushed!;
    if (mid.kind !== 'filters' || end.kind !== 'filters') throw new Error();
    expect(mid.allSwitch).toBe(0);
    expect(mid.celebritySwitch).toBe(0);
    expect(end.allSwitch).toBe(0);
    expect(end.celebritySwitch).toBe(1);
    expect(end.count).toBe(NAMES_AVAILABLE.celebrity);
    expect(end.filtersApplied).toBe(true);
  });
});

describe('scene — popularity', () => {
  it('slides the detail sheet up and draws the chart', () => {
    const early = phone(451, 'A')!.stack;
    const late = phone(512, 'A')!.stack;
    expect(late.sheetProgress).toBe(1);
    if (early.sheet?.kind !== 'detail' || late.sheet?.kind !== 'detail') throw new Error();
    expect(early.sheet.chart).toBe(0);
    expect(late.sheet.chart).toBe(1);
  });
});

describe('scene — end', () => {
  it('clears every phone and brings in the end card', () => {
    expect(visible(570, 'A')).toBe(false);
    expect(visible(570, 'B')).toBe(false);
    expect(at(570).endCard).toBeGreaterThan(0);
    expect(at(599).endCard).toBeCloseTo(1, 1);
    expect(at(500).endCard).toBe(0);
  });
});

describe('scene — continuity', () => {
  it('never teleports a phone between slots', () => {
    // An eased entrance legitimately peaks near 210px/frame. A teleport is a
    // jump between slots, the smallest of which is 780px, so 300px separates
    // the two cleanly.
    for (const id of ['A', 'B'] as const) {
      for (let f = 1; f < DURATION_IN_FRAMES; f++) {
        const a = phone(f - 1, id)!.y;
        const b = phone(f, id)!.y;
        expect(Math.abs(b - a)).toBeLessThan(300);
      }
    }
  });

  it('never snaps a card back toward centre mid-swipe', () => {
    for (const id of ['A', 'B'] as const) {
      for (let f = 1; f < DURATION_IN_FRAMES; f++) {
        const prev = phone(f - 1, id)!.stack.base;
        const next = phone(f, id)!.stack.base;
        if (prev.kind !== 'explore' || next.kind !== 'explore') continue;
        if (!prev.front || !next.front || prev.front.name !== next.front.name) continue;
        expect(Math.abs(next.front.x)).toBeGreaterThanOrEqual(Math.abs(prev.front.x));
      }
    }
  });
});

describe('scene — phone scale', () => {
  it('keeps the Reel phones full size throughout', () => {
    for (const f of [100, 250, 400]) expect(phone(f, 'A')!.scale).toBe(layout.phoneScale);
  });

  it('shrinks the mint phone for the Feed match and restores it after', () => {
    const feed = getLayout('feed');
    const a = (f: number) => getScene(f, feed).phones.find((p) => p.id === 'A')!.scale;
    expect(a(100)).toBe(feed.phoneScale);
    expect(a(260)).toBe(feed.matchScale);
    expect(a(400)).toBe(feed.phoneScale);
  });
});

describe('scene — end card', () => {
  it('never draws the end card over a phone that is still on screen', () => {
    // The phone's exit eases in, so it lingers; starting the end card on a
    // fixed frame drew the logo straight over the popularity sheet.
    for (const format of ['reel', 'feed', 'square'] as const) {
      const l = getLayout(format);
      for (let f = 0; f < DURATION_IN_FRAMES; f++) {
        const s = getScene(f, l);
        if (s.endCard <= 0) continue;
        for (const p of s.phones) expect(p.y).toBeGreaterThanOrEqual(l.height);
      }
    }
  });
});

describe('scene — end card timing', () => {
  it('runs the end card for at least two seconds once the phone has gone', () => {
    const start = Array.from({ length: DURATION_IN_FRAMES }, (_, f) => f).find(
      (f) => at(f).endCard > 0,
    )!;
    expect(DURATION_IN_FRAMES - start).toBeGreaterThanOrEqual(60);
  });
});

describe('scene — cast variants', () => {
  it('celebrates whichever name the cast matches on, not a hardcoded one', () => {
    const variant = { ...CAST, esme: { ...CAST.esme, name: 'Nova' } };
    const s = getScene(330, layout, variant).phones.find((p) => p.id === 'B')!.stack.base;
    if (s.kind !== 'explore') throw new Error();
    expect(s.matched.name).toBe('Nova');
  });
});

describe('scene — drift', () => {
  it('keeps both phones inside the frame as they sway, in every format', () => {
    for (const format of AD_FORMATS) {
      const layout = getLayout(format);
      for (let f = 0; f < DURATION_IN_FRAMES; f++) {
        for (const p of getScene(f, layout).phones) {
          const left = (layout.width - PHONE_W * p.scale) / 2 + p.x;
          expect(left).toBeGreaterThanOrEqual(0);
          expect(left + PHONE_W * p.scale).toBeLessThanOrEqual(layout.width);
        }
      }
    }
  });

  it('never moves the two phones in lockstep', () => {
    const layout = getLayout('reel');
    const [a, b] = getScene(250, layout).phones;
    expect(a!.x).not.toBeCloseTo(b!.x, 1);
  });
});
