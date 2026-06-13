import { v } from 'convex/values';
import { internalMutation, query, QueryCtx } from './_generated/server';
import { CATEGORY_KEYS, deriveCategories, maskFor, orderCategories, type PopPoint } from './categories';

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
 * Batch correction of name data (origin and/or meaning). Used by the data
 * audit to fix AI-generated seed errors at scale. Keyed by `name` (names are
 * globally unique in this DB). For each correction:
 *   - Patches `meaning` if provided and different.
 *   - If `origin` provided and different, applies the same atomic bookkeeping
 *     as updateNameOrigin: patches the row, adjusts nameOriginStats
 *     (decrement old / increment new), and patches every referencing
 *     selection's denormalized origin.
 *
 * Idempotent: a correction whose values already match is reported `noop`.
 * Apply in batches of ~100 to stay under Convex's per-mutation limits.
 */
export const applyNameCorrections = internalMutation({
  args: {
    corrections: v.array(
      v.object({
        name: v.string(),
        origin: v.optional(v.string()),
        meaning: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const results: Record<string, unknown>[] = [];

    for (const c of args.corrections) {
      const row = await ctx.db
        .query('names')
        .withIndex('by_name', (q) => q.eq('name', c.name))
        .first();
      if (!row) {
        results.push({ name: c.name, status: 'not_found' });
        continue;
      }

      const patch: { origin?: string; meaning?: string } = {};
      if (c.meaning !== undefined && c.meaning !== row.meaning) {
        patch.meaning = c.meaning;
      }
      const originChanged = c.origin !== undefined && c.origin !== row.origin;
      if (originChanged) {
        patch.origin = c.origin;
      }

      if (patch.origin === undefined && patch.meaning === undefined) {
        results.push({ name: c.name, status: 'noop' });
        continue;
      }

      await ctx.db.patch(row._id, patch);

      let selectionsUpdated = 0;
      if (originChanged) {
        const oldOrigin = row.origin;
        const newOrigin = c.origin as string;

        const oldStat = await ctx.db
          .query('nameOriginStats')
          .withIndex('by_origin_gender', (q) => q.eq('origin', oldOrigin).eq('gender', row.gender))
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
          .withIndex('by_origin_gender', (q) => q.eq('origin', newOrigin).eq('gender', row.gender))
          .unique();
        if (newStat) {
          await ctx.db.patch(newStat._id, { count: newStat.count + 1, updatedAt: now });
        } else {
          await ctx.db.insert('nameOriginStats', {
            origin: newOrigin,
            gender: row.gender,
            count: 1,
            updatedAt: now,
          });
        }

        const referencing = await ctx.db
          .query('selections')
          .withIndex('by_name', (q) => q.eq('nameId', row._id))
          .collect();
        for (const sel of referencing) {
          await ctx.db.patch(sel._id, { origin: newOrigin });
          selectionsUpdated++;
        }
      }

      results.push({
        name: c.name,
        status: 'applied',
        meaningChanged: patch.meaning !== undefined,
        originChanged,
        oldOrigin: originChanged ? row.origin : undefined,
        newOrigin: originChanged ? c.origin : undefined,
        selectionsUpdated,
      });
    }

    const summary = {
      total: results.length,
      applied: results.filter((r) => r.status === 'applied').length,
      noop: results.filter((r) => r.status === 'noop').length,
      notFound: results.filter((r) => r.status === 'not_found').length,
      meaningChanges: results.filter((r) => r.meaningChanged === true).length,
      originChanges: results.filter((r) => r.originChanged === true).length,
    };
    return { summary, results };
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
      .withIndex('by_origin_gender', (q) => q.eq('origin', oldOrigin).eq('gender', name.gender))
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

/**
 * Read-only distribution report for derived categories (#293). Paginated; the
 * analyze-categories script loops pages and sums. Does NOT write. Use it on dev
 * to calibrate CATEGORY_THRESHOLDS before running computeDerivedCategories.
 */
export const analyzeCategoryDistribution = query({
  args: { limit: v.optional(v.number()), cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const pageSize = args.limit ?? 75;
    const result = await ctx.db
      .query('names')
      .paginate({ numItems: pageSize, cursor: (args.cursor as string | null) ?? null });

    const counts: Record<string, number> = {};
    for (const k of CATEGORY_KEYS) counts[k] = 0;
    let uncategorized = 0;
    let multi = 0;

    for (const name of result.page) {
      const seriesM = (
        await ctx.db
          .query('namePopularity')
          .withIndex('by_name_gender', (q) => q.eq('name', name.name).eq('gender', 'M'))
          .collect()
      ).map((r): PopPoint => ({ year: r.year, rank: r.rank, count: r.count }));
      const seriesF = (
        await ctx.db
          .query('namePopularity')
          .withIndex('by_name_gender', (q) => q.eq('name', name.name).eq('gender', 'F'))
          .collect()
      ).map((r): PopPoint => ({ year: r.year, rank: r.rank, count: r.count }));

      const derived = deriveCategories({
        gender: name.gender,
        primaryGender: name.primaryGender,
        currentRank: name.currentRank,
        seriesM,
        seriesF,
      });
      for (const k of derived) counts[k] = (counts[k] ?? 0) + 1;
      if (derived.length === 0) uncategorized++;
      if (derived.length > 1) multi++;
    }

    return {
      processed: result.page.length,
      counts,
      uncategorized,
      multi,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

/**
 * Compute & store derived categories for every name (#293). Paginated; small
 * page size because each name reads its full M+F popularity series (~140 rows
 * each) and the per-mutation read cap is ~32k. Idempotent: only patches when the
 * category set or mask changes. Preserves any existing 'celebrity' tag so this
 * pass and the Celebrity pass are order-independent and independently re-runnable.
 */
export const computeDerivedCategories = internalMutation({
  args: { limit: v.optional(v.number()), cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const pageSize = args.limit ?? 75;
    const result = await ctx.db
      .query('names')
      .paginate({ numItems: pageSize, cursor: (args.cursor as string | null) ?? null });

    let updated = 0;
    for (const name of result.page) {
      const fetchSeries = async (g: 'M' | 'F'): Promise<PopPoint[]> =>
        (
          await ctx.db
            .query('namePopularity')
            .withIndex('by_name_gender', (q) => q.eq('name', name.name).eq('gender', g))
            .collect()
        ).map((r) => ({ year: r.year, rank: r.rank, count: r.count }));

      const seriesM = await fetchSeries('M');
      const seriesF = await fetchSeries('F');

      const derived = deriveCategories({
        gender: name.gender,
        primaryGender: name.primaryGender,
        currentRank: name.currentRank,
        seriesM,
        seriesF,
      });
      const hadCelebrity = (name.categories ?? []).includes('celebrity');
      const next = orderCategories(hadCelebrity ? [...derived, 'celebrity'] : derived);
      const mask = maskFor(next);

      const prev = name.categories ?? [];
      const sameSet =
        prev.length === next.length && CATEGORY_KEYS.every((k) => prev.includes(k) === next.includes(k));
      if (!sameSet || name.categoryMask !== mask) {
        await ctx.db.patch(name._id, { categories: next, categoryMask: mask });
        updated++;
      }
    }

    return {
      processed: result.page.length,
      updated,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

/**
 * Tag curated celebrity-associated names (#293). For each entry whose name exists
 * in the DB, add 'celebrity' to its categories (dedup, canonical order), update
 * categoryMask, and set celebrityNote. Idempotent: re-applying identical tags is a
 * noop. Names not in the DB are reported, not created. Apply in batches of ~100.
 */
export const applyCelebrityTags = internalMutation({
  args: {
    entries: v.array(v.object({ name: v.string(), note: v.string() })),
  },
  handler: async (ctx, args) => {
    let applied = 0;
    let noop = 0;
    const notFound: string[] = [];

    for (const entry of args.entries) {
      const row = await ctx.db
        .query('names')
        .withIndex('by_name', (q) => q.eq('name', entry.name))
        .first();
      if (!row) {
        notFound.push(entry.name);
        continue;
      }
      const hasTag = (row.categories ?? []).includes('celebrity');
      if (hasTag && row.celebrityNote === entry.note) {
        noop++;
        continue;
      }
      const next = orderCategories([...(row.categories ?? []), 'celebrity']);
      await ctx.db.patch(row._id, {
        categories: next,
        categoryMask: maskFor(next),
        celebrityNote: entry.note,
      });
      applied++;
    }

    return { total: args.entries.length, applied, noop, notFound };
  },
});

/**
 * One-time backfill (#293): set selections.categoryMask from the referenced
 * name's categoryMask. Run AFTER categories are computed/applied. Idempotent —
 * skips rows that already have a mask. Paginated. (Re-run this any time
 * categories are recomputed, since masks are denormalized onto selections.)
 */
export const backfillSelectionCategoryMask = internalMutation({
  args: { limit: v.optional(v.number()), cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const pageSize = args.limit ?? 500;
    const result = await ctx.db
      .query('selections')
      .paginate({ numItems: pageSize, cursor: (args.cursor as string | null) ?? null });

    let patched = 0;
    for (const sel of result.page) {
      if (sel.categoryMask !== undefined) continue;
      const name = await ctx.db.get(sel.nameId);
      if (!name) continue;
      await ctx.db.patch(sel._id, { categoryMask: name.categoryMask ?? 0 });
      patched++;
    }
    return {
      processed: result.page.length,
      patched,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

/**
 * Rebuild nameCategoryStats from the names table (#293). Keyed by
 * (categoryMask, gender, origin). Pass accumulate=false on the first page to
 * clear, true on subsequent pages. Paginated. Run after categories are final.
 */
export const rebuildNameCategoryStats = internalMutation({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    accumulate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const pageSize = args.limit ?? 1000;
    const accumulate = args.accumulate ?? false;

    if (!accumulate) {
      const existing = await ctx.db.query('nameCategoryStats').collect();
      for (const row of existing) await ctx.db.delete(row._id);
    }

    const result = await ctx.db
      .query('names')
      .paginate({ numItems: pageSize, cursor: (args.cursor as string | null) ?? null });

    const pageTally: Record<string, number> = {};
    for (const name of result.page) {
      const mask = name.categoryMask ?? 0;
      const key = `${mask}|${name.gender}|${name.origin}`;
      pageTally[key] = (pageTally[key] ?? 0) + 1;
    }

    const now = Date.now();
    for (const [key, increment] of Object.entries(pageTally)) {
      const [maskStr, gender, origin] = key.split('|');
      if (maskStr === undefined || gender === undefined || origin === undefined) continue;
      const mask = Number(maskStr);
      const existing = await ctx.db
        .query('nameCategoryStats')
        .withIndex('by_mask_gender_origin', (q) =>
          q.eq('categoryMask', mask).eq('gender', gender).eq('origin', origin),
        )
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, { count: existing.count + increment, updatedAt: now });
      } else {
        await ctx.db.insert('nameCategoryStats', { categoryMask: mask, gender, origin, count: increment, updatedAt: now });
      }
    }

    return { processed: result.page.length, isDone: result.isDone, continueCursor: result.continueCursor };
  },
});
