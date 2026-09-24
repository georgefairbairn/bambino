/**
 * Starter Instagram grid for the Bambino profile (George, 2026-09-23).
 *
 * The name lists are US Social Security Administration data from the app's
 * own `namePopularity` table, queried on production on 2026-09-23. Every name
 * is in the app's `names` table, so anyone who sees a post can find it there.
 */

export type Gender = 'female' | 'male';

export interface ListRow {
  name: string;
  gender: Gender;
  /** The headline figure, right-aligned. */
  stat: string;
  /** Small print under the name. */
  note: string;
}

export interface NameList {
  title: string;
  subtitle: string;
  rows: readonly ListRow[];
}

const risingRow = (name: string, gender: Gender, then: number, now: number): ListRow => ({
  name,
  gender,
  stat: `↑ ${(then - now).toLocaleString('en-US')}`,
  note: `#${then.toLocaleString('en-US')} → #${now}`,
});

/** Among the 2023 top 200, the biggest climbs in rank since 2018. */
export const RISING_GIRLS: NameList = {
  title: 'Fastest-rising girl names',
  subtitle: 'Places climbed in the US, 2018 to 2023',
  rows: [
    risingRow('Wrenley', 'female', 2427, 175),
    risingRow('Alora', 'female', 921, 199),
    risingRow('Alaia', 'female', 584, 120),
    risingRow('Lainey', 'female', 460, 54),
    risingRow('Oaklynn', 'female', 543, 157),
    risingRow('Wren', 'female', 468, 195),
    risingRow('Hallie', 'female', 461, 194),
    risingRow('Maeve', 'female', 334, 73),
    risingRow('Oakley', 'female', 389, 153),
    risingRow('Margot', 'female', 358, 148),
  ],
};

export const RISING_BOYS: NameList = {
  title: 'Fastest-rising boy names',
  subtitle: 'Places climbed in the US, 2018 to 2023',
  rows: [
    risingRow('Stetson', 'male', 586, 183),
    risingRow('Tate', 'male', 494, 197),
    risingRow('Luka', 'male', 321, 95),
    risingRow('Adonis', 'male', 366, 174),
    risingRow('Walker', 'male', 266, 85),
    risingRow('Atlas', 'male', 290, 111),
    risingRow('Theo', 'male', 243, 78),
    risingRow('Enzo', 'male', 227, 90),
    risingRow('Thiago', 'male', 200, 72),
    // Ties with Arlo on 119 places; Adriel ranked higher in 2023.
    risingRow('Adriel', 'male', 232, 113),
  ],
};

const comebackRow = (
  name: string,
  gender: Gender,
  in1920: number,
  low: { rank: number; year: number },
  now: number,
): ListRow => ({
  name,
  gender,
  stat: `#${now} in 2023`,
  note: `#${in1920} in 1920 · #${low.rank.toLocaleString('en-US')} in ${low.year}`,
});

/**
 * Top 100 in 1920, fell below #400 at their lowest (1950–2000, worst single
 * year), and back in the top 100 in 2023, the newest year in the app's data.
 * Ordered by 2023 rank.
 */
export const COMEBACKS: NameList = {
  title: 'Classic names making a comeback',
  subtitle: 'US top 100 in 1920, then out of fashion for decades',
  rows: [
    comebackRow('Emma', 'female', 46, { rank: 463, year: 1976 }, 2),
    comebackRow('Eleanor', 'female', 25, { rank: 693, year: 1986 }, 14),
    comebackRow('Violet', 'female', 77, { rank: 1290, year: 1990 }, 16),
    comebackRow('Hazel', 'female', 34, { rank: 1334, year: 1983 }, 18),
    comebackRow('Leo', 'male', 48, { rank: 486, year: 1995 }, 18),
    comebackRow('Ella', 'female', 88, { rank: 1152, year: 1987 }, 32),
    comebackRow('Lucy', 'female', 94, { rank: 588, year: 1978 }, 40),
    comebackRow('Stella', 'female', 82, { rank: 1328, year: 1995 }, 46),
    comebackRow('Lillian', 'female', 18, { rank: 487, year: 1978 }, 55),
    comebackRow('Josephine', 'female', 28, { rank: 498, year: 1987 }, 64),
  ],
};

export const LISTS = {
  'rising-girls': RISING_GIRLS,
  'rising-boys': RISING_BOYS,
  comebacks: COMEBACKS,
} as const;
export type ListId = keyof typeof LISTS;

/**
 * One grid tile. `frame` posts are stills of the Feed-format ad (already
 * Instagram's 4:5), `brand` and `list` have their own layouts, and `reel`
 * reuses a rendered ad.
 */
export type PostSlide =
  | { kind: 'frame'; frame: number; hook: 'looking' | 'cant-agree' }
  | { kind: 'brand' }
  | { kind: 'list'; list: ListId };

export interface GridPost {
  slug: string;
  /** One slide is a single image; several make a carousel. */
  slides: readonly PostSlide[] | 'reel';
}

/**
 * The grid as it should read, top-left first. Instagram puts the newest post
 * top-left, so these get posted in reverse: the last one here goes up first.
 */
export const GRID: readonly GridPost[] = [
  { slug: 'reel-looking', slides: 'reel' },
  { slug: 'brand', slides: [{ kind: 'brand' }] },
  {
    slug: 'how-it-works',
    slides: [
      { kind: 'frame', frame: 175, hook: 'looking' },
      { kind: 'frame', frame: 255, hook: 'looking' },
      { kind: 'frame', frame: 330, hook: 'looking' },
      { kind: 'frame', frame: 599, hook: 'looking' },
    ],
  },
  { slug: 'filters', slides: [{ kind: 'frame', frame: 425, hook: 'looking' }] },
  { slug: 'cant-agree', slides: [{ kind: 'frame', frame: 30, hook: 'cant-agree' }] },
  { slug: 'popularity', slides: [{ kind: 'frame', frame: 510, hook: 'looking' }] },
  { slug: 'rising-girls', slides: [{ kind: 'list', list: 'rising-girls' }] },
  { slug: 'comebacks', slides: [{ kind: 'list', list: 'comebacks' }] },
  { slug: 'rising-boys', slides: [{ kind: 'list', list: 'rising-boys' }] },
];
