export type Gender = 'male' | 'female' | 'neutral';
export type Trend = 'rising' | 'falling' | 'steady';

export interface AdName {
  name: string;
  gender: Gender;
  origin: string;
  /** Current SSA rank. */
  rank: number;
  meaning: string;
  /** SSA ranks for 2014 through 2023, oldest first. */
  tenYearRanks: readonly number[];
}

/**
 * The name both partners like. It also drives the popularity sheet, so it
 * carries the chart's history and the ranked total the sheet quotes. Typing
 * the cast this way means a variant can't swap the match without supplying
 * them, which is how the sheet used to end up showing Esme's data.
 */
export interface MatchedName extends AdName {
  /** [year, rank], oldest first, for the Popularity Over Time chart. */
  history: readonly (readonly [number, number])[];
  /** Names ranked for this gender in the latest year (lowest rank in the data). */
  rankedOutOf: number;
}

/** The shape a variant must supply to swap the cast. `esme` is the match. */
export interface Cast {
  olivia: AdName;
  otto: AdName;
  juniper: AdName;
  wren: AdName;
  esme: MatchedName;
}

/**
 * Real rows from production, read 2026-09-22. Do not invent names, ranks or
 * meanings; the cards are meant to be the app's cards.
 */
export const CAST = {
  olivia: {
    name: 'Olivia',
    gender: 'female',
    origin: 'Latin',
    rank: 1,
    meaning:
      "Derived from the Latin word 'oliva' meaning olive tree. The olive branch is a symbol of peace, giving this name connotations of harmony and beauty.",
    tenYearRanks: [2, 2, 2, 2, 2, 1, 1, 1, 1, 1],
  },
  otto: {
    name: 'Otto',
    gender: 'male',
    origin: 'Germanic',
    rank: 282,
    meaning:
      "A strong and classic name derived directly from the Old High German element 'aud' or 'od' meaning 'wealth,' 'fortune,' or 'prosperity.' It was a royal name of the highest order in medieval Germany.",
    tenYearRanks: [630, 544, 526, 478, 431, 429, 389, 335, 311, 282],
  },
  juniper: {
    name: 'Juniper',
    gender: 'female',
    origin: 'Latin',
    rank: 113,
    meaning:
      "Juniper comes from the Latin 'juniperus,' the name of the evergreen shrub known for its aromatic berries and its use in herbal medicine and spiritual purification rituals across many cultures.",
    tenYearRanks: [488, 427, 349, 310, 281, 193, 171, 137, 113, 113],
  },
  wren: {
    name: 'Wren',
    gender: 'neutral',
    origin: 'English',
    rank: 195,
    meaning:
      "Wren is derived from the Old English word 'wrenna,' referring to the tiny but remarkably spirited songbird known for its loud, beautiful call despite its small size.",
    tenYearRanks: [702, 706, 524, 464, 468, 425, 360, 251, 184, 195],
  },
  esme: {
    name: 'Esme',
    gender: 'female',
    origin: 'French',
    rank: 325,
    meaning:
      "Esme comes from the Old French word 'esmé,' meaning 'esteemed' or 'beloved,' and was historically used in Scotland where it was brought by French courtiers. It gained literary fame through J.D. Salinger's story 'For Esmé — with Love and Squalor.'",
    tenYearRanks: [812, 680, 682, 585, 548, 426, 396, 377, 303, 325],
    history: [
      [2004, 2294], [2005, 2485], [2006, 1921], [2007, 1943], [2008, 1512],
      [2009, 1063], [2010, 927], [2011, 979], [2012, 975], [2013, 926],
      [2014, 812], [2015, 680], [2016, 682], [2017, 585], [2018, 548],
      [2019, 426], [2020, 396], [2021, 377], [2022, 303], [2023, 325],
    ],
    /** 2023, female: the lowest rank in namePopularity. */
    rankedOutOf: 5640,
  },
} as const satisfies Cast;

/** Names available with no filters, and with Celebrity switched on. */
export const NAMES_AVAILABLE = { all: 13359, celebrity: 295 } as const;

/**
 * constants/origins.ts, in full, so a cast variant gets the same flag the app
 * would show. Copied rather than imported: the ad bundle can't resolve the
 * app's `@/` alias.
 */
const ORIGIN_FLAGS: Record<string, string> = {
  Hebrew: '\u{1F1EE}\u{1F1F1}',
  English: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
  American: '\u{1F1FA}\u{1F1F8}',
  'African American': '\u{1F1FA}\u{1F1F8}',
  Latin: '\u{1F3DB}\u{FE0F}',
  Greek: '\u{1F1EC}\u{1F1F7}',
  French: '\u{1F1EB}\u{1F1F7}',
  Irish: '\u{1F1EE}\u{1F1EA}',
  Germanic: '\u{1F1E9}\u{1F1EA}',
  Arabic: '\u{1F1F8}\u{1F1E6}',
  Spanish: '\u{1F1EA}\u{1F1F8}',
  Scottish: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
  'South Asian': '\u{1F1EE}\u{1F1F3}',
  Welsh: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}',
  Nordic: '\u{1F1F8}\u{1F1EA}',
  Italian: '\u{1F1EE}\u{1F1F9}',
  'East Asian': '\u{1F30F}',
  Slavic: '\u{1F1F7}\u{1F1FA}',
  Persian: '\u{1F1EE}\u{1F1F7}',
  African: '\u{1F30D}',
  Hawaiian: '\u{1F33A}',
  Turkish: '\u{1F1F9}\u{1F1F7}',
  Celtic: '\u{2618}\u{FE0F}',
  Dutch: '\u{1F1F3}\u{1F1F1}',
  Aramaic: '\u{1F1F8}\u{1F1FE}',
  Basque: '\u{1F1EA}\u{1F1F8}',
  Yiddish: '\u{2721}\u{FE0F}',
  'Native American': '\u{1FAB6}',
  Egyptian: '\u{1F1EA}\u{1F1EC}',
  Nahuatl: '\u{1F1F2}\u{1F1FD}',
  Hungarian: '\u{1F1ED}\u{1F1FA}',
};

/** constants/origins.ts getOriginFlag, including its globe fallback. */
export const getOriginFlag = (origin: string): string => ORIGIN_FLAGS[origin] || '\u{1F30D}';

/** constants/popularity.ts TIERS. */
const TIERS: readonly { maxRank: number; label: string; gradient: readonly [string, string] }[] = [
  { maxRank: 50, label: 'Extremely Popular', gradient: ['#34D399', '#059669'] },
  { maxRank: 200, label: 'Very Popular', gradient: ['#60A5FA', '#3B82F6'] },
  { maxRank: 500, label: 'Popular', gradient: ['#FBBF24', '#D97706'] },
  { maxRank: 1000, label: 'Uncommon', gradient: ['#C4A7E7', '#A78BFA'] },
  { maxRank: Infinity, label: 'Rare', gradient: ['#A89BB5', '#8B7BA5'] },
];

/** constants/popularity.ts getPopularityTier, for a ranked name. */
export const getTier = (rank: number) => TIERS.find((t) => rank <= t.maxRank)!;

/** The best-ranked year in a history: the app's PEAK YEAR tile. */
export const getPeak = (
  history: readonly (readonly [number, number])[],
): readonly [number, number] => history.reduce((best, r) => (r[1] < best[1] ? r : best));

/**
 * convex/popularity.ts: compare the latest rank with five years earlier. A
 * drop of 10 or more places is rising, a gain of 10 or more is falling.
 */
export const getTrend = (ranks: readonly number[]): Trend | null => {
  if (ranks.length < 6) return null;
  const latest = ranks[ranks.length - 1]!;
  const fiveYearsAgo = ranks[ranks.length - 6]!;
  const diff = latest - fiveYearsAgo;
  if (diff <= -10) return 'rising';
  if (diff >= 10) return 'falling';
  return 'steady';
};
