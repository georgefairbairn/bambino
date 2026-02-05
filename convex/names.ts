import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

const nameValidator = v.object({
  name: v.string(),
  gender: v.string(),
  origin: v.string(),
  meaning: v.string(),
  phonetic: v.string(),
});

export const seedNames = mutation({
  args: { names: v.array(nameValidator) },
  handler: async (ctx, args) => {
    const now = Date.now();
    let inserted = 0;
    let skipped = 0;

    for (const nameData of args.names) {
      const existing = await ctx.db
        .query('names')
        .withIndex('by_name', (q) => q.eq('name', nameData.name))
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert('names', {
        name: nameData.name,
        gender: nameData.gender,
        origin: nameData.origin,
        meaning: nameData.meaning,
        phonetic: nameData.phonetic,
        length: nameData.name.length,
        firstLetter: nameData.name[0].toUpperCase(),
        createdAt: now,
      });
      inserted++;
    }

    return { inserted, skipped };
  },
});

export const getNameById = query({
  args: { id: v.id('names') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getAvailableOrigins = query({
  args: {},
  handler: async (ctx) => {
    const allNames = await ctx.db.query('names').collect();
    const origins = new Set(allNames.map((n) => n.origin));
    return Array.from(origins).sort();
  },
});

export const searchNames = query({
  args: {
    search: v.optional(v.string()),
    gender: v.optional(v.string()),
    firstLetter: v.optional(v.string()),
    minLength: v.optional(v.number()),
    maxLength: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    let results;

    if (args.gender && args.firstLetter) {
      results = await ctx.db
        .query('names')
        .withIndex('by_gender_and_first_letter', (q) =>
          q.eq('gender', args.gender!).eq('firstLetter', args.firstLetter!.toUpperCase()),
        )
        .collect();
    } else if (args.gender) {
      results = await ctx.db
        .query('names')
        .withIndex('by_gender', (q) => q.eq('gender', args.gender!))
        .collect();
    } else if (args.firstLetter) {
      results = await ctx.db
        .query('names')
        .withIndex('by_first_letter', (q) => q.eq('firstLetter', args.firstLetter!.toUpperCase()))
        .collect();
    } else {
      results = await ctx.db.query('names').collect();
    }

    if (args.minLength !== undefined) {
      results = results.filter((n) => n.length >= args.minLength!);
    }
    if (args.maxLength !== undefined) {
      results = results.filter((n) => n.length <= args.maxLength!);
    }

    if (args.search) {
      const searchLower = args.search.toLowerCase();
      results = results.filter((n) => n.name.toLowerCase().includes(searchLower));
    }

    return results.slice(0, limit);
  },
});
