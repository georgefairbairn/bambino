import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

const popularityRecordValidator = v.object({
  name: v.string(),
  gender: v.string(),
  year: v.number(),
  rank: v.number(),
  count: v.number(),
});

export const seedPopularity = mutation({
  args: { records: v.array(popularityRecordValidator) },
  handler: async (ctx, args) => {
    const now = Date.now();
    let inserted = 0;
    let skipped = 0;

    for (const record of args.records) {
      const existing = await ctx.db
        .query('namePopularity')
        .withIndex('by_name_gender_year', (q) =>
          q.eq('name', record.name).eq('gender', record.gender).eq('year', record.year)
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

export const updateNamesWithCurrentRank = mutation({
  args: { year: v.number() },
  handler: async (ctx, args) => {
    const names = await ctx.db.query('names').collect();
    let updated = 0;

    for (const name of names) {
      // Map app gender to SSA gender format
      const ssaGender = name.gender === 'male' ? 'M' : name.gender === 'female' ? 'F' : null;

      if (!ssaGender) {
        // Skip neutral gender names
        continue;
      }

      const popularityRecord = await ctx.db
        .query('namePopularity')
        .withIndex('by_name_gender_year', (q) =>
          q.eq('name', name.name).eq('gender', ssaGender).eq('year', args.year)
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
