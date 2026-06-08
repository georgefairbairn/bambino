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
        firstLetter: nameData.name.charAt(0).toUpperCase(),
        sortKey: Math.random(),
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

async function getActionedSelections(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return [];

  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique();
  if (!user) return [];

  return ctx.db
    .query('selections')
    .withIndex('by_user', (q) => q.eq('userId', user._id))
    .collect();
}


/**
 * Sum total counts from nameOriginStats grouped by origin. When a gender
 * filter is provided, sums only matching rows. Returns Record<origin, count>.
 */
async function readOriginTotals(
  ctx: QueryCtx,
  genderValue: 'male' | 'female' | null,
): Promise<Record<string, number>> {
  const stats = await ctx.db.query('nameOriginStats').collect();
  const totals: Record<string, number> = {};
  for (const row of stats) {
    if (genderValue !== null && row.gender !== genderValue) continue;
    totals[row.origin] = (totals[row.origin] ?? 0) + row.count;
  }
  return totals;
}

/**
 * Tally the user's actioned selections by origin, filtered to a specific
 * gender if provided. Selections without denormalized origin/gender (legacy
 * rows pre-backfill) are skipped — they won't be subtracted from totals,
 * which is the safe-bias direction (counts may be slightly inflated until
 * backfill runs, never deflated).
 */
function tallyActionedByOrigin(
  selections: { origin?: string; gender?: string }[],
  genderValue: 'male' | 'female' | null,
): Record<string, number> {
  const tallied: Record<string, number> = {};
  for (const s of selections) {
    if (!s.origin || !s.gender) continue;
    if (genderValue !== null && s.gender !== genderValue) continue;
    tallied[s.origin] = (tallied[s.origin] ?? 0) + 1;
  }
  return tallied;
}

export const getFilteredNameCount = query({
  args: {
    genderFilter: v.optional(v.union(v.literal('boy'), v.literal('girl'), v.literal('both'))),
    originFilter: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const genderFilter = args.genderFilter ?? 'both';
    const genderValue = genderFilter === 'boy' ? 'male' : genderFilter === 'girl' ? 'female' : null;

    // undefined = no filter (all origins), [] = no origins (0 results), [...] = specific origins
    if (args.originFilter !== undefined && args.originFilter.length === 0) {
      return 0;
    }

    const totals = await readOriginTotals(ctx, genderValue);
    const selections = await getActionedSelections(ctx);
    const actioned = tallyActionedByOrigin(selections, genderValue);

    const originSet = args.originFilter !== undefined ? new Set(args.originFilter) : null;

    let count = 0;
    for (const [origin, total] of Object.entries(totals)) {
      if (originSet && !originSet.has(origin)) continue;
      const remaining = total - (actioned[origin] ?? 0);
      if (remaining > 0) count += remaining;
    }
    return count;
  },
});

export const getOriginCounts = query({
  args: {
    genderFilter: v.optional(v.union(v.literal('boy'), v.literal('girl'), v.literal('both'))),
  },
  handler: async (ctx, args) => {
    const genderFilter = args.genderFilter ?? 'both';
    const genderValue = genderFilter === 'boy' ? 'male' : genderFilter === 'girl' ? 'female' : null;

    const totals = await readOriginTotals(ctx, genderValue);
    const selections = await getActionedSelections(ctx);
    const actioned = tallyActionedByOrigin(selections, genderValue);

    const counts: Record<string, number> = {};
    for (const [origin, total] of Object.entries(totals)) {
      const remaining = total - (actioned[origin] ?? 0);
      if (remaining > 0) counts[origin] = remaining;
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
    // #201: require auth to drop the unauthenticated scrape surface. The app
    // always authenticates, so this is a no-op for legitimate clients.
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const limit = args.limit ?? 50;
    const { gender, firstLetter, minLength, maxLength, search } = args;

    // Require an indexed filter (gender or firstLetter). Without one this
    // would .collect() the entire ~80k-row names table and blow past
    // Convex's 32k read limit. search/minLength/maxLength are post-filters
    // applied to an already-narrowed index scan (#200).
    if (!gender && !firstLetter) {
      throw new Error('searchNames requires at least a gender or firstLetter filter');
    }

    const normalizedLetter = firstLetter?.toUpperCase();

    let results;
    if (gender && normalizedLetter) {
      results = await ctx.db
        .query('names')
        .withIndex('by_gender_and_first_letter', (q) =>
          q.eq('gender', gender).eq('firstLetter', normalizedLetter),
        )
        .collect();
    } else if (gender) {
      results = await ctx.db
        .query('names')
        .withIndex('by_gender', (q) => q.eq('gender', gender))
        .collect();
    } else {
      // normalizedLetter is defined here: the guard above guarantees gender
      // or firstLetter, and we're in the else of `gender`.
      results = await ctx.db
        .query('names')
        .withIndex('by_first_letter', (q) => q.eq('firstLetter', normalizedLetter as string))
        .collect();
    }

    if (minLength !== undefined) {
      results = results.filter((n) => n.length >= minLength);
    }
    if (maxLength !== undefined) {
      results = results.filter((n) => n.length <= maxLength);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      results = results.filter((n) => n.name.toLowerCase().includes(searchLower));
    }

    return results.slice(0, limit);
  },
});

export const backfillSortKeys = internalMutation({
  args: {
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const BATCH_SIZE = 500;
    const results = await ctx.db
      .query('names')
      .paginate({ numItems: BATCH_SIZE, cursor: args.cursor ?? null });

    let patched = 0;
    for (const name of results.page) {
      if (name.sortKey === undefined) {
        await ctx.db.patch(name._id, { sortKey: Math.random() });
        patched++;
      }
    }

    return {
      patched,
      isDone: results.isDone,
      cursor: results.continueCursor,
    };
  },
});

/**
 * Walks the names table and rebuilds nameOriginStats from scratch.
 * Idempotent: deletes all existing rows on the first page, then accumulates
 * counts across pages. Run once after deploying the schema change, then
 * re-run any time you need to recompute totals (e.g. after a bulk seed).
 *
 * Paginated to stay under Convex's per-mutation read/write limits on
 * the ~80K-row names table.
 */
export const populateOriginStats = internalMutation({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    // Caller passes false on the first page to clear existing rows; true
    // on subsequent pages to accumulate. The script below handles this.
    accumulate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const pageSize = args.limit ?? 1000;
    const accumulate = args.accumulate ?? false;

    if (!accumulate) {
      // First page: clear existing stats so we get a clean rebuild.
      const existing = await ctx.db.query('nameOriginStats').collect();
      for (const row of existing) {
        await ctx.db.delete(row._id);
      }
    }

    const result = await ctx.db
      .query('names')
      .paginate({ numItems: pageSize, cursor: (args.cursor as string | null) ?? null });

    // Build a partial tally for this page.
    const pageTally: Record<string, number> = {};
    for (const name of result.page) {
      const key = `${name.origin}|${name.gender}`;
      pageTally[key] = (pageTally[key] ?? 0) + 1;
    }

    // Merge into nameOriginStats.
    const now = Date.now();
    for (const [key, increment] of Object.entries(pageTally)) {
      const [origin, gender] = key.split('|');
      if (origin === undefined || gender === undefined) continue;
      const existing = await ctx.db
        .query('nameOriginStats')
        .withIndex('by_origin_gender', (q) => q.eq('origin', origin).eq('gender', gender))
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, {
          count: existing.count + increment,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert('nameOriginStats', {
          origin,
          gender,
          count: increment,
          updatedAt: now,
        });
      }
    }

    return {
      processed: result.page.length,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

/**
 * One-time backfill: walks the selections table and patches each row with
 * the origin + gender from its referenced name. Idempotent — skips rows
 * that already have both fields set. Paginated.
 */
export const backfillSelectionOriginGender = internalMutation({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const pageSize = args.limit ?? 500;
    const result = await ctx.db
      .query('selections')
      .paginate({ numItems: pageSize, cursor: (args.cursor as string | null) ?? null });

    let patched = 0;
    let alreadyOk = 0;
    let nameMissing = 0;

    for (const sel of result.page) {
      if (sel.origin && sel.gender) {
        alreadyOk++;
        continue;
      }
      const name = await ctx.db.get(sel.nameId);
      if (!name) {
        // Selection points to a deleted name; leave it alone.
        nameMissing++;
        continue;
      }
      await ctx.db.patch(sel._id, {
        origin: name.origin,
        gender: name.gender,
      });
      patched++;
    }

    return {
      processed: result.page.length,
      patched,
      alreadyOk,
      nameMissing,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

/**
 * Correct a name's origin (e.g. fixing seed-data bugs). Atomically:
 *   1. Patches the names row.
 *   2. Decrements the old (origin, gender) stats row.
 *   3. Increments the new (origin, gender) stats row.
 *   4. Patches every selection referencing this name with the new origin.
 *
 * Selections are updated in a single mutation here; if a name has thousands
 * of selections you may hit Convex's per-mutation write limit. In that
 * case we'd need to paginate, but no name in Bambino should be that hot
 * in v1. Returns counts so the caller can verify.
 */
export const updateNameOrigin = internalMutation({
  args: {
    nameId: v.id('names'),
    newOrigin: v.string(),
  },
  handler: async (ctx, args) => {
    const name = await ctx.db.get(args.nameId);
    if (!name) {
      throw new Error(`Name not found: ${args.nameId}`);
    }
    const oldOrigin = name.origin;
    if (oldOrigin === args.newOrigin) {
      return {
        nameId: args.nameId,
        oldOrigin,
        newOrigin: args.newOrigin,
        nameUpdated: false,
        selectionsUpdated: 0,
        statsUpdated: false,
      };
    }

    // 1. Patch the name itself.
    await ctx.db.patch(args.nameId, { origin: args.newOrigin });

    // 2. Adjust nameOriginStats (decrement old, increment new).
    const now = Date.now();
    const oldStat = await ctx.db
      .query('nameOriginStats')
      .withIndex('by_origin_gender', (q) =>
        q.eq('origin', oldOrigin).eq('gender', name.gender),
      )
      .unique();
    if (oldStat) {
      const nextCount = oldStat.count - 1;
      if (nextCount <= 0) {
        await ctx.db.delete(oldStat._id);
      } else {
        await ctx.db.patch(oldStat._id, { count: nextCount, updatedAt: now });
      }
    }

    const newStat = await ctx.db
      .query('nameOriginStats')
      .withIndex('by_origin_gender', (q) =>
        q.eq('origin', args.newOrigin).eq('gender', name.gender),
      )
      .unique();
    if (newStat) {
      await ctx.db.patch(newStat._id, { count: newStat.count + 1, updatedAt: now });
    } else {
      await ctx.db.insert('nameOriginStats', {
        origin: args.newOrigin,
        gender: name.gender,
        count: 1,
        updatedAt: now,
      });
    }

    // 3. Update every selection referencing this name.
    const referencingSelections = await ctx.db
      .query('selections')
      .withIndex('by_name', (q) => q.eq('nameId', args.nameId))
      .collect();
    for (const sel of referencingSelections) {
      await ctx.db.patch(sel._id, { origin: args.newOrigin });
    }

    return {
      nameId: args.nameId,
      oldOrigin,
      newOrigin: args.newOrigin,
      nameUpdated: true,
      selectionsUpdated: referencingSelections.length,
      statsUpdated: true,
    };
  },
});
