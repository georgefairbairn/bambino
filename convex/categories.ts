// Pure, dependency-free. Safe to import from both Convex functions and the RN app.
// Do NOT import 'convex/values' or any server API here.

export const CATEGORY_KEYS = [
  'trending',
  'classic',
  'celebrity',
  'vintage',
  'unisex',
  'rare',
] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const CATEGORY_BIT: Record<CategoryKey, number> = {
  trending: 1 << 0,
  classic: 1 << 1,
  celebrity: 1 << 2,
  vintage: 1 << 3,
  unisex: 1 << 4,
  rare: 1 << 5,
};

export function isCategoryKey(s: string): s is CategoryKey {
  return (CATEGORY_KEYS as readonly string[]).includes(s);
}

export function maskFor(categories: readonly string[] | undefined | null): number {
  let m = 0;
  for (const c of categories ?? []) if (isCategoryKey(c)) m |= CATEGORY_BIT[c];
  return m;
}

/** Re-orders an arbitrary set of category keys into canonical order, de-duped. */
export function orderCategories(keys: readonly string[]): CategoryKey[] {
  return CATEGORY_KEYS.filter((k) => keys.includes(k));
}

export interface PopPoint {
  year: number;
  rank: number;
  count: number;
}

// Tunable thresholds. CALIBRATE on dev before any prod write.
export const CATEGORY_THRESHOLDS = {
  trendingMaxCurrentRank: 1000,
  trendingMinGain: 150, // rank2013 - rank2023
  classicDecadeTopN: 200,
  classicMinDecades: 6, // of the 8 decades 1950s..2020s
  classicMaxCurrentRank: 500,
  vintagePeakTopN: 300,
  vintageMaxCurrentRank: 1000, // currentRank must be > this (or unranked)
  unisexMinorityShare: 0.25,
  unisexBothTopN: 1000,
  rareMinBestEver: 1000, // best-ever rank must be > this
} as const;

function bestRankInRange(series: PopPoint[], startYear: number, endYear: number): number {
  let best = Infinity;
  for (const p of series) {
    if (p.year >= startYear && p.year <= endYear && p.rank < best) best = p.rank;
  }
  return best;
}

function rankInYear(series: PopPoint[], year: number): number | null {
  const p = series.find((s) => s.year === year);
  return p ? p.rank : null;
}

function countInYear(series: PopPoint[], year: number): number | null {
  const p = series.find((s) => s.year === year);
  return p ? p.count : null;
}

export interface DeriveInput {
  gender: string; // 'male' | 'female' | 'neutral'
  primaryGender?: 'male' | 'female';
  currentRank?: number | null;
  seriesM: PopPoint[];
  seriesF: PopPoint[];
}

/** Returns the DERIVED category keys for one name. Never includes 'celebrity'. */
export function deriveCategories(input: DeriveInput): CategoryKey[] {
  const T = CATEGORY_THRESHOLDS;
  const { gender, primaryGender, seriesM, seriesF } = input;
  const currentRank = input.currentRank ?? null;

  // Primary series = the gender this name is "about" (matches how currentRank was chosen).
  let primary: PopPoint[];
  if (gender === 'male') primary = seriesM;
  else if (gender === 'female') primary = seriesF;
  else if (primaryGender === 'male') primary = seriesM;
  else if (primaryGender === 'female') primary = seriesF;
  else {
    const latest = (s: PopPoint[]) => s.reduce((y, p) => Math.max(y, p.year), -Infinity);
    primary = latest(seriesM) >= latest(seriesF) ? seriesM : seriesF;
  }

  const out: CategoryKey[] = [];

  // Trending — currently ranked and climbed hard over the last decade.
  const r2013 = rankInYear(primary, 2013);
  const r2023 = rankInYear(primary, 2023);
  if (
    currentRank != null &&
    currentRank <= T.trendingMaxCurrentRank &&
    r2013 != null &&
    r2023 != null &&
    r2013 - r2023 >= T.trendingMinGain
  ) {
    out.push('trending');
  }

  // Classic — top-N across most decades, still relevant now.
  let decadesTop = 0;
  for (let d = 1950; d <= 2020; d += 10) {
    if (bestRankInRange(primary, d, d + 9) <= T.classicDecadeTopN) decadesTop++;
  }
  if (
    decadesTop >= T.classicMinDecades &&
    currentRank != null &&
    currentRank <= T.classicMaxCurrentRank
  ) {
    out.push('classic');
  }

  // Vintage — peaked in an older decade, faded now.
  const peakOld = bestRankInRange(primary, 1900, 1969);
  if (
    peakOld <= T.vintagePeakTopN &&
    (currentRank == null || currentRank > T.vintageMaxCurrentRank)
  ) {
    out.push('vintage');
  }

  // Unisex — neutral, or meaningful in both genders recently.
  let unisex = gender === 'neutral';
  if (!unisex) {
    const cM = countInYear(seriesM, 2023);
    const cF = countInYear(seriesF, 2023);
    if (cM != null && cF != null) {
      const minority = Math.min(cM, cF);
      const combined = cM + cF;
      if (combined > 0 && minority / combined >= T.unisexMinorityShare) unisex = true;
    }
    const rM = rankInYear(seriesM, 2023);
    const rF = rankInYear(seriesF, 2023);
    if (rM != null && rF != null && rM <= T.unisexBothTopN && rF <= T.unisexBothTopN) unisex = true;
  }
  if (unisex) out.push('unisex');

  // Rare — never cracked the top N in any year (either gender), but is ranked at all.
  const bestEver = Math.min(bestRankInRange(seriesM, 0, 9999), bestRankInRange(seriesF, 0, 9999));
  if (bestEver !== Infinity && bestEver > T.rareMinBestEver) out.push('rare');

  return orderCategories(out);
}
