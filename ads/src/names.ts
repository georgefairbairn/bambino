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
  },
} as const satisfies Record<string, AdName>;

/** The shape a variant must supply to swap the cast. */
export type Cast = Record<keyof typeof CAST, AdName>;

/** Esme, female, 2004 → 2023. Drives the Popularity Over Time chart. */
export const ESME_TWENTY_YEARS: readonly (readonly [number, number])[] = [
  [2004, 2294], [2005, 2485], [2006, 1921], [2007, 1943], [2008, 1512],
  [2009, 1063], [2010, 927], [2011, 979], [2012, 975], [2013, 926],
  [2014, 812], [2015, 680], [2016, 682], [2017, 585], [2018, 548],
  [2019, 426], [2020, 396], [2021, 377], [2022, 303], [2023, 325],
];

/** Names available with no filters, and with Celebrity switched on. */
export const NAMES_AVAILABLE = { all: 13359, celebrity: 295 } as const;

/** constants/origins.ts — only the origins the cast uses. */
export const ORIGIN_FLAGS: Record<string, string> = {
  Latin: '\u{1F3DB}\u{FE0F}',
  Germanic: '\u{1F1E9}\u{1F1EA}',
  English: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
  French: '\u{1F1EB}\u{1F1F7}',
};

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
