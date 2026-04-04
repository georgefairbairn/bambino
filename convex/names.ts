import { v } from 'convex/values';
import { internalMutation, query, QueryCtx } from './_generated/server';

const nameValidator = v.object({
  name: v.string(),
  gender: v.string(),
  origin: v.string(),
  meaning: v.string(),
  phonetic: v.string(),
});

export const seedNames = internalMutation({
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

async function getActionedNameIds(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return new Set<string>();

  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique();
  if (!user) return new Set<string>();

  const selections = await ctx.db
    .query('selections')
    .withIndex('by_user', (q) => q.eq('userId', user._id))
    .collect();

  return new Set(selections.map((s) => s.nameId as string));
}

export const getFilteredNameCount = query({
  args: {
    genderFilter: v.optional(v.union(v.literal('boy'), v.literal('girl'), v.literal('both'))),
    originFilter: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const genderFilter = args.genderFilter ?? 'both';
    const genderValue = genderFilter === 'boy' ? 'male' : genderFilter === 'girl' ? 'female' : null;

    const actionedIds = await getActionedNameIds(ctx);

    let names =
      genderValue !== null
        ? await ctx.db
            .query('names')
            .withIndex('by_gender', (q) => q.eq('gender', genderValue))
            .collect()
        : await ctx.db.query('names').collect();

    // undefined = no filter (all origins), [] = no origins (0 results), [...] = specific origins
    if (args.originFilter !== undefined) {
      const originSet = new Set(args.originFilter);
      names = names.filter((n) => originSet.has(n.origin));
    }

    names = names.filter((n) => !actionedIds.has(n._id as string));

    return names.length;
  },
});

export const getOriginCounts = query({
  args: {
    genderFilter: v.optional(v.union(v.literal('boy'), v.literal('girl'), v.literal('both'))),
  },
  handler: async (ctx, args) => {
    const genderFilter = args.genderFilter ?? 'both';
    const genderValue = genderFilter === 'boy' ? 'male' : genderFilter === 'girl' ? 'female' : null;

    const actionedIds = await getActionedNameIds(ctx);

    const allNames =
      genderValue !== null
        ? await ctx.db
            .query('names')
            .withIndex('by_gender', (q) => q.eq('gender', genderValue))
            .collect()
        : await ctx.db.query('names').collect();

    const counts: Record<string, number> = {};
    for (const name of allNames) {
      if (actionedIds.has(name._id as string)) continue;
      counts[name.origin] = (counts[name.origin] ?? 0) + 1;
    }
    return counts;
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
