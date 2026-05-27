import { v } from 'convex/values';
import { internalMutation, query } from './_generated/server';

// Tier boundaries used by the swipe queue. Keep in sync with the swipe
// queue logic in convex/selections.ts.
export const TIER_TOP = 0; // ranks 1–1000
export const TIER_MID = 1; // ranks 1001–5000
export const TIER_LONG_TAIL = 2; // ranks 5001+

export function rankToTier(rank: number | undefined | null): number | undefined {
  if (rank === undefined || rank === null) return undefined;
  if (rank <= 1000) return TIER_TOP;
  if (rank <= 5000) return TIER_MID;
  return TIER_LONG_TAIL;
}

const popularityRecordValidator = v.object({
  name: v.string(),
  gender: v.string(),
  year: v.number(),
  rank: v.number(),
  count: v.number(),
});

export const seedPopularity = internalMutation({
  args: { records: v.array(popularityRecordValidator) },
  handler: async (ctx, args) => {
    const now = Date.now();
    let inserted = 0;
    let skipped = 0;

    for (const record of args.records) {
      const existing = await ctx.db
        .query('namePopularity')
        .withIndex('by_name_gender_year', (q) =>
          q.eq('name', record.name).eq('gender', record.gender).eq('year', record.year),
        )
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert('namePopularity', {
        name: record.name,
        gender: record.gender,
        year: record.year,
        rank: record.rank,
        count: record.count,
        createdAt: now,
      });
      inserted++;
    }

    return { inserted, skipped };
  },
});

export const updateNamesWithCurrentRank = internalMutation({
  args: {
    year: v.number(),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const pageSize = args.limit ?? 500;
    const result = await ctx.db
      .query('names')
      .paginate({ numItems: pageSize, cursor: (args.cursor as any) ?? null });

    let updated = 0;

    for (const name of result.page) {
      if (name.gender === 'neutral') {
        const maleRecord = await ctx.db
          .query('namePopularity')
          .withIndex('by_name_gender_year', (q) =>
            q.eq('name', name.name).eq('gender', 'M').eq('year', args.year),
          )
          .first();
        const femaleRecord = await ctx.db
          .query('namePopularity')
          .withIndex('by_name_gender_year', (q) =>
            q.eq('name', name.name).eq('gender', 'F').eq('year', args.year),
          )
          .first();

        const maleRank = maleRecord?.rank ?? Infinity;
        const femaleRank = femaleRecord?.rank ?? Infinity;

        if (maleRecord || femaleRecord) {
          const isMaleBetter = maleRank <= femaleRank;
          const chosenRank = isMaleBetter ? maleRecord!.rank : femaleRecord!.rank;
          await ctx.db.patch(name._id, {
            currentRank: chosenRank,
            primaryGender: isMaleBetter ? 'male' : 'female',
            popularityTier: rankToTier(chosenRank),
          });
          updated++;
        }
        continue;
      }

      const ssaGender = name.gender === 'male' ? 'M' : 'F';

      const popularityRecord = await ctx.db
        .query('namePopularity')
        .withIndex('by_name_gender_year', (q) =>
          q.eq('name', name.name).eq('gender', ssaGender).eq('year', args.year),
        )
        .first();

      if (popularityRecord) {
        await ctx.db.patch(name._id, {
          currentRank: popularityRecord.rank,
          popularityTier: rankToTier(popularityRecord.rank),
        });
        updated++;
      }
    }

    return {
      updated,
      processed: result.page.length,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

// Backfill currentRank for names that have no rank yet — uses each name's
// most recent year of popularity data as a fallback. Run AFTER
// updateNamesWithCurrentRank for the target year, so this only touches
// names that didn't have a record in that year (e.g. names popular in
// 1950 but no longer in the SSA top list).
//
// Records primaryGender for neutral names based on which gender's record
// is more recent (or higher-ranked if tied on year).
export const backfillCurrentRankFromMostRecent = internalMutation({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const pageSize = args.limit ?? 500;
    const result = await ctx.db
      .query('names')
      .paginate({ numItems: pageSize, cursor: (args.cursor as string | null) ?? null });

    let updated = 0;
    let alreadyRanked = 0;
    let stillRankless = 0;

    for (const name of result.page) {
      if (name.currentRank !== undefined && name.currentRank !== null) {
        alreadyRanked++;
        continue;
      }

      async function mostRecentForGender(g: 'M' | 'F') {
        const records = await ctx.db
          .query('namePopularity')
          .withIndex('by_name_gender', (q) => q.eq('name', name.name).eq('gender', g))
          .collect();
        if (records.length === 0) return null;
        // Pick highest year; tiebreaker = lower rank (more popular).
        return records.reduce((best, r) => {
          if (r.year > best.year) return r;
          if (r.year === best.year && r.rank < best.rank) return r;
          return best;
        });
      }

      if (name.gender === 'neutral') {
        const mr = await mostRecentForGender('M');
        const fr = await mostRecentForGender('F');
        if (!mr && !fr) {
          stillRankless++;
          continue;
        }
        // Prefer the gender with the more recent record, then better rank
        let chosen: { rank: number; year: number } | null = null;
        let chosenGender: 'male' | 'female' = 'male';
        if (mr && fr) {
          if (mr.year > fr.year || (mr.year === fr.year && mr.rank <= fr.rank)) {
            chosen = mr;
            chosenGender = 'male';
          } else {
            chosen = fr;
            chosenGender = 'female';
          }
        } else if (mr) {
          chosen = mr;
          chosenGender = 'male';
        } else if (fr) {
          chosen = fr;
          chosenGender = 'female';
        }
        if (chosen) {
          await ctx.db.patch(name._id, {
            currentRank: chosen.rank,
            primaryGender: chosenGender,
            popularityTier: rankToTier(chosen.rank),
          });
          updated++;
        }
        continue;
      }

      const ssaGender = name.gender === 'male' ? 'M' : 'F';
      const fallback = await mostRecentForGender(ssaGender);
      if (fallback) {
        await ctx.db.patch(name._id, {
          currentRank: fallback.rank,
          popularityTier: rankToTier(fallback.rank),
        });
        updated++;
      } else {
        stillRankless++;
      }
    }

    return {
      processed: result.page.length,
      updated,
      alreadyRanked,
      stillRankless,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

// One-time backfill: walks the names table and sets popularityTier
// derived from the existing currentRank value. Idempotent; only patches
// rows where the computed tier differs from what's there. Paginated.
export const backfillPopularityTier = internalMutation({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const pageSize = args.limit ?? 500;
    const result = await ctx.db
      .query('names')
      .paginate({ numItems: pageSize, cursor: (args.cursor as string | null) ?? null });

    let updated = 0;
    let alreadyCorrect = 0;
    let unranked = 0;

    for (const name of result.page) {
      const expectedTier = rankToTier(name.currentRank);

      if (expectedTier === undefined) {
        if (name.popularityTier === undefined) {
          unranked++;
        } else {
          // currentRank was cleared somehow but tier still set; reset it
          await ctx.db.patch(name._id, { popularityTier: undefined });
          updated++;
        }
        continue;
      }

      if (name.popularityTier === expectedTier) {
        alreadyCorrect++;
        continue;
      }

      await ctx.db.patch(name._id, { popularityTier: expectedTier });
      updated++;
    }

    return {
      processed: result.page.length,
      updated,
      alreadyCorrect,
      unranked,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const getNamePopularity = query({
  args: {
    name: v.string(),
    gender: v.string(),
    startYear: v.optional(v.number()),
    endYear: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Map app gender to SSA gender format
    const ssaGender = args.gender === 'male' ? 'M' : args.gender === 'female' ? 'F' : args.gender;

    const records = await ctx.db
      .query('namePopularity')
      .withIndex('by_name_gender', (q) => q.eq('name', args.name).eq('gender', ssaGender))
      .collect();

    let filtered = records;

    if (args.startYear !== undefined) {
      filtered = filtered.filter((r) => r.year >= args.startYear!);
    }

    if (args.endYear !== undefined) {
      filtered = filtered.filter((r) => r.year <= args.endYear!);
    }

    // Sort by year ascending
    filtered.sort((a, b) => a.year - b.year);

    return filtered.map((r) => ({
      year: r.year,
      rank: r.rank,
      count: r.count,
    }));
  },
});

export const getPopularNamesForYear = query({
  args: {
    year: v.number(),
    gender: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    let records;

    if (args.gender) {
      // Map app gender to SSA gender format
      const ssaGender = args.gender === 'male' ? 'M' : args.gender === 'female' ? 'F' : args.gender;

      records = await ctx.db
        .query('namePopularity')
        .withIndex('by_year_gender', (q) => q.eq('year', args.year).eq('gender', ssaGender))
        .collect();
    } else {
      records = await ctx.db
        .query('namePopularity')
        .withIndex('by_year_gender', (q) => q.eq('year', args.year))
        .collect();
    }

    // Sort by rank ascending (best ranks first)
    records.sort((a, b) => a.rank - b.rank);

    return records.slice(0, limit).map((r) => ({
      name: r.name,
      gender: r.gender,
      rank: r.rank,
      count: r.count,
    }));
  },
});

export const getNamePopularitySummary = query({
  args: {
    name: v.string(),
    gender: v.string(),
  },
  handler: async (ctx, args) => {
    // Determine which SSA gender(s) to query. For 'male'/'female' it's a
    // direct mapping. For 'neutral' (or any other value), fetch both M and F
    // and pick the series whose most recent record is more recent — matches
    // the backfill logic so currentRank and the sparkline come from the
    // same gender that update-ranks chose.
    async function fetchByGender(g: 'M' | 'F') {
      return ctx.db
        .query('namePopularity')
        .withIndex('by_name_gender', (q) => q.eq('name', args.name).eq('gender', g))
        .collect();
    }

    let records: Awaited<ReturnType<typeof fetchByGender>>;
    if (args.gender === 'male') {
      records = await fetchByGender('M');
    } else if (args.gender === 'female') {
      records = await fetchByGender('F');
    } else {
      const m = await fetchByGender('M');
      const f = await fetchByGender('F');
      const mLatest = m.reduce((y, r) => Math.max(y, r.year), -Infinity);
      const fLatest = f.reduce((y, r) => Math.max(y, r.year), -Infinity);
      // Tiebreaker: more records wins (broader history)
      if (mLatest > fLatest) records = m;
      else if (fLatest > mLatest) records = f;
      else records = m.length >= f.length ? m : f;
    }

    if (records.length === 0) {
      return {
        currentRank: null,
        trend: null as 'rising' | 'falling' | 'steady' | null,
        peakYear: null as number | null,
        peakRank: null as number | null,
        sparklinePoints: [] as number[],
      };
    }

    // Sort by year ascending
    records.sort((a, b) => a.year - b.year);

    // Current rank: most recent year's rank
    const mostRecent = records[records.length - 1];
    const currentRank = mostRecent.rank;

    // Peak year: year with lowest (best) rank
    const peak = records.reduce((best, r) => (r.rank < best.rank ? r : best), records[0]);
    const peakYear = peak.year;

    // Trend: compare most recent rank to rank 5 years prior
    const fiveYearsAgo = records.find((r) => r.year === mostRecent.year - 5);
    let trend: 'rising' | 'falling' | 'steady' | null = null;
    if (fiveYearsAgo) {
      const diff = mostRecent.rank - fiveYearsAgo.rank;
      if (diff <= -10)
        trend = 'rising'; // rank number decreased = improved
      else if (diff >= 10)
        trend = 'falling'; // rank number increased = worsened
      else trend = 'steady';
    }

    // Sparkline: last 10 years of data, inverted so lower rank = higher point
    const last10 = records.filter((r) => r.year > mostRecent.year - 10);
    const maxRank = Math.max(...last10.map((r) => r.rank));
    const sparklinePoints = last10.map((r) => maxRank - r.rank + 1);

    // Get the highest rank for the chosen gender in the most recent year (1 record via index)
    const highestRankRecord = await ctx.db
      .query('namePopularity')
      .withIndex('by_year_gender_rank', (q) =>
        q.eq('year', mostRecent.year).eq('gender', mostRecent.gender),
      )
      .order('desc')
      .first();
    const totalRankedNames = highestRankRecord?.rank ?? 0;

    return {
      currentRank,
      trend,
      peakYear,
      peakRank: peak.rank,
      sparklinePoints,
      totalRankedNames,
    };
  },
});
