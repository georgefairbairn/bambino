import { v } from 'convex/values';
import { internalMutation, query } from './_generated/server';

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
  args: { year: v.number() },
  handler: async (ctx, args) => {
    const names = await ctx.db.query('names').collect();
    let updated = 0;

    for (const name of names) {
      if (name.gender === 'neutral') {
        // For unisex names, check both genders and pick the better (lower) rank
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
          await ctx.db.patch(name._id, {
            currentRank: isMaleBetter ? maleRecord!.rank : femaleRecord!.rank,
            primaryGender: isMaleBetter ? 'male' : 'female',
          });
          updated++;
        }
        continue;
      }

      // Map app gender to SSA gender format
      const ssaGender = name.gender === 'male' ? 'M' : 'F';

      const popularityRecord = await ctx.db
        .query('namePopularity')
        .withIndex('by_name_gender_year', (q) =>
          q.eq('name', name.name).eq('gender', ssaGender).eq('year', args.year),
        )
        .first();

      if (popularityRecord) {
        await ctx.db.patch(name._id, { currentRank: popularityRecord.rank });
        updated++;
      }
    }

    return { updated, total: names.length };
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
    // Map app gender to SSA gender format
    const ssaGender = args.gender === 'male' ? 'M' : args.gender === 'female' ? 'F' : null;

    if (!ssaGender) {
      return {
        currentRank: null,
        trend: null as 'rising' | 'falling' | 'steady' | null,
        peakYear: null as number | null,
        peakRank: null as number | null,
        sparklinePoints: [] as number[],
      };
    }

    const records = await ctx.db
      .query('namePopularity')
      .withIndex('by_name_gender', (q) => q.eq('name', args.name).eq('gender', ssaGender))
      .collect();

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

    // Get the highest rank for this gender in the most recent year (1 record via index)
    const highestRankRecord = await ctx.db
      .query('namePopularity')
      .withIndex('by_year_gender_rank', (q) =>
        q.eq('year', mostRecent.year).eq('gender', ssaGender),
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
