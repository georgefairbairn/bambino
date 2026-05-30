import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { mutation, query, QueryCtx, MutationCtx } from './_generated/server';
import { Doc, Id } from './_generated/dataModel';
import { getEffectivePremiumStatusHelper } from './premium';

const FREE_TIER_SWIPE_LIMIT = 25;

// ---- Selection counter helpers (#183) -------------------------------------

type CounterField = 'likedCount' | 'rejectedCount' | 'skippedCount';

const COUNTER_FIELDS: Record<'like' | 'reject' | 'skip', CounterField> = {
  like: 'likedCount',
  reject: 'rejectedCount',
  skip: 'skippedCount',
};

/**
 * Lazily backfill the running counters from the selections table. Called
 * automatically by adjustCounters before any increment/decrement so users
 * created before this field existed get correct counts on their first
 * counter-touching mutation. Idempotent.
 */
async function ensureCountersBackfilled(
  ctx: MutationCtx,
  user: Doc<'users'>,
): Promise<Doc<'users'>> {
  if (
    user.likedCount !== undefined &&
    user.rejectedCount !== undefined &&
    user.skippedCount !== undefined
  ) {
    return user;
  }
  const [likes, rejects, skips] = await Promise.all([
    ctx.db
      .query('selections')
      .withIndex('by_user_type', (q) => q.eq('userId', user._id).eq('selectionType', 'like'))
      .collect(),
    ctx.db
      .query('selections')
      .withIndex('by_user_type', (q) => q.eq('userId', user._id).eq('selectionType', 'reject'))
      .collect(),
    ctx.db
      .query('selections')
      .withIndex('by_user_type', (q) => q.eq('userId', user._id).eq('selectionType', 'skip'))
      .collect(),
  ]);
  await ctx.db.patch(user._id, {
    likedCount: likes.length,
    rejectedCount: rejects.length,
    skippedCount: skips.length,
  });
  return {
    ...user,
    likedCount: likes.length,
    rejectedCount: rejects.length,
    skippedCount: skips.length,
  };
}

/**
 * Apply a set of delta counter changes to the user row. Pass positive ints
 * for inserts, negative for deletes. Selection types not in deltas are
 * untouched. Floors at 0 to defend against any drift.
 */
async function adjustCounters(
  ctx: MutationCtx,
  user: Doc<'users'>,
  deltas: Partial<Record<'like' | 'reject' | 'skip', number>>,
): Promise<void> {
  const filled = await ensureCountersBackfilled(ctx, user);
  const patch: Partial<Pick<Doc<'users'>, 'likedCount' | 'rejectedCount' | 'skippedCount'>> = {};
  for (const [type, delta] of Object.entries(deltas) as [
    'like' | 'reject' | 'skip',
    number,
  ][]) {
    if (!delta) continue;
    const field = COUNTER_FIELDS[type];
    patch[field] = Math.max(0, (filled[field] ?? 0) + delta);
  }
  if (Object.keys(patch).length > 0) {
    await ctx.db.patch(user._id, patch);
  }
}

// 'hidden' selections aren't counted in stats — they were once a like or
// reject and decremented on transition.
function counterTypeFor(
  selectionType: Doc<'selections'>['selectionType'],
): 'like' | 'reject' | 'skip' | null {
  if (selectionType === 'hidden') return null;
  return selectionType;
}

async function getCurrentUserOrThrow(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error('Not authenticated');
  }

  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique();

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}

// Delete any match for this name between the user and their partner
async function deleteMatchForName(
  ctx: MutationCtx,
  userId: Id<'users'>,
  partnerId: Id<'users'>,
  nameId: Id<'names'>,
) {
  const [user1Id, user2Id] = userId < partnerId ? [userId, partnerId] : [partnerId, userId];

  const match = await ctx.db
    .query('matches')
    .withIndex('by_name_users', (q) =>
      q.eq('nameId', nameId).eq('user1Id', user1Id).eq('user2Id', user2Id),
    )
    .unique();

  if (match) {
    await ctx.db.delete(match._id);
  }
}

async function getCurrentUserOrNull(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique();
}

// Check for a match when a user likes a name
async function checkForMatchAndCreate(
  ctx: MutationCtx,
  nameId: Id<'names'>,
  likingUserId: Id<'users'>,
  partnerId: Id<'users'>,
): Promise<{
  matchId: Id<'matches'>;
  name: Doc<'names'> | null;
  matchedAt: number;
  isFirstMatch: boolean;
} | null> {
  // Check if partner has liked this name
  const partnerSelection = await ctx.db
    .query('selections')
    .withIndex('by_user_name', (q) => q.eq('userId', partnerId).eq('nameId', nameId))
    .unique();

  if (!partnerSelection || partnerSelection.selectionType !== 'like') {
    return null;
  }

  // Check if match already exists (in either user order)
  const [user1Id, user2Id] =
    likingUserId < partnerId ? [likingUserId, partnerId] : [partnerId, likingUserId];

  const existingMatch = await ctx.db
    .query('matches')
    .withIndex('by_name_users', (q) =>
      q.eq('nameId', nameId).eq('user1Id', user1Id).eq('user2Id', user2Id),
    )
    .unique();

  if (existingMatch) {
    return null;
  }

  const existingPartnerMatch = await ctx.db
    .query('matches')
    .withIndex('by_user1_user2', (q) => q.eq('user1Id', user1Id).eq('user2Id', user2Id))
    .first();

  const now = Date.now();
  const matchId = await ctx.db.insert('matches', {
    nameId,
    user1Id,
    user2Id,
    matchedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  const name = await ctx.db.get(nameId);

  return { matchId, name, matchedAt: now, isFirstMatch: existingPartnerMatch === null };
}

export const recordSelection = mutation({
  args: {
    nameId: v.id('names'),
    selectionType: v.union(v.literal('like'), v.literal('reject'), v.literal('skip')),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Free tier: limit to 25 swipes total (check effective premium including partner sharing)
    const premiumStatus = await getEffectivePremiumStatusHelper(ctx, user._id);
    if (!premiumStatus.isPremium) {
      const existing = await ctx.db
        .query('selections')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .take(FREE_TIER_SWIPE_LIMIT);

      if (existing.length >= FREE_TIER_SWIPE_LIMIT) {
        return { error: 'FREE_TIER_SWIPE_LIMIT' as const };
      }
    }

    const existingSelection = await ctx.db
      .query('selections')
      .withIndex('by_user_name', (q) => q.eq('userId', user._id).eq('nameId', args.nameId))
      .unique();

    const now = Date.now();

    if (existingSelection) {
      // If changing from like to something else, remove the match
      if (
        existingSelection.selectionType === 'like' &&
        args.selectionType !== 'like' &&
        user.partnerId
      ) {
        await deleteMatchForName(ctx, user._id, user.partnerId, args.nameId);
      }

      // Heal denormalized origin/gender on rows predating that schema
      // change (no-op once backfill has run).
      const patch: {
        selectionType: typeof args.selectionType;
        updatedAt: number;
        origin?: string;
        gender?: string;
      } = {
        selectionType: args.selectionType,
        updatedAt: now,
      };
      if (!existingSelection.origin || !existingSelection.gender) {
        const nameDoc = await ctx.db.get(args.nameId);
        if (nameDoc) {
          patch.origin = nameDoc.origin;
          patch.gender = nameDoc.gender;
        }
      }
      await ctx.db.patch(existingSelection._id, patch);

      // Counter sync (#183): selection type changed → decrement old, increment new
      const oldCounterType = counterTypeFor(existingSelection.selectionType);
      const newCounterType = counterTypeFor(args.selectionType);
      if (oldCounterType !== newCounterType) {
        const deltas: Partial<Record<'like' | 'reject' | 'skip', number>> = {};
        if (oldCounterType) deltas[oldCounterType] = -1;
        if (newCounterType) deltas[newCounterType] = 1;
        await adjustCounters(ctx, user, deltas);
      }

      if (args.selectionType === 'like' && user.partnerId) {
        const match = await checkForMatchAndCreate(ctx, args.nameId, user._id, user.partnerId);
        return { selectionId: existingSelection._id, match };
      }

      return { selectionId: existingSelection._id, match: null };
    }

    const nameDoc = await ctx.db.get(args.nameId);
    const selectionId = await ctx.db.insert('selections', {
      userId: user._id,
      nameId: args.nameId,
      selectionType: args.selectionType,
      origin: nameDoc?.origin,
      gender: nameDoc?.gender,
      createdAt: now,
      updatedAt: now,
    });

    // Counter sync (#183): new selection of countable type → increment
    const newCounterType = counterTypeFor(args.selectionType);
    if (newCounterType) {
      await adjustCounters(ctx, user, { [newCounterType]: 1 });
    }

    if (args.selectionType === 'like' && user.partnerId) {
      const match = await checkForMatchAndCreate(ctx, args.nameId, user._id, user.partnerId);
      return { selectionId, match };
    }

    return { selectionId, match: null };
  },
});

// Tier-ordered swipe queue: surfaces popular names first, falls back to
// progressively less popular tiers as the user swipes through the top pool.
// Within each tier results are randomly ordered (sortKey shuffle, walking
// from randomSeed forward then wrapping). Names with no popularityTier
// (unranked) are deprioritized to the very end.
const TIER_ORDER = [0, 1, 2] as const;

export const getSwipeQueue = query({
  args: {
    limit: v.optional(v.number()),
    randomSeed: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    const limit = args.limit ?? 50;

    // (#160) Per-candidate indexed lookup instead of collecting every prior
    // selection. Read set is bounded by queue size (~50) regardless of how
    // many names the user has swiped, so the subscription doesn't bloat
    // linearly with engagement.
    const isAlreadySwiped = async (nameId: Id<'names'>): Promise<boolean> => {
      const existing = await ctx.db
        .query('selections')
        .withIndex('by_user_name', (q) => q.eq('userId', user._id).eq('nameId', nameId))
        .unique();
      return existing !== null;
    };

    const genderFilter = user.genderFilter ?? 'both';
    const originFilter = user.originFilter;
    const genderValue = genderFilter === 'boy' ? 'male' : genderFilter === 'girl' ? 'female' : null;
    const originSet = originFilter && originFilter.length > 0 ? new Set(originFilter) : null;

    const buildTierQuery = (tier: number, startKey: number) =>
      genderValue !== null
        ? ctx.db
            .query('names')
            .withIndex('by_gender_tier_sort_key', (q) =>
              q.eq('gender', genderValue).eq('popularityTier', tier).gte('sortKey', startKey),
            )
        : ctx.db
            .query('names')
            .withIndex('by_tier_sort_key', (q) =>
              q.eq('popularityTier', tier).gte('sortKey', startKey),
            );

    const results: Doc<'names'>[] = [];
    const seen = new Set<string>();

    async function tryAccept(name: Doc<'names'>): Promise<boolean> {
      if (results.length >= limit) return false;
      if (seen.has(name._id)) return false;
      if (originSet && !originSet.has(name.origin)) return false;
      if (await isAlreadySwiped(name._id)) return false;
      seen.add(name._id);
      results.push(name);
      return true;
    }

    // Walk each tier in order. Within a tier, scan from randomSeed forward
    // then wrap around to 0..randomSeed. Stop as soon as we hit `limit`.
    for (const tier of TIER_ORDER) {
      if (results.length >= limit) break;

      // First pass: randomSeed → end of tier
      for await (const name of buildTierQuery(tier, args.randomSeed)) {
        await tryAccept(name);
        if (results.length >= limit) break;
      }
      if (results.length >= limit) break;

      // Wrap: 0 → randomSeed
      for await (const name of buildTierQuery(tier, 0)) {
        if (name.sortKey >= args.randomSeed) break;
        await tryAccept(name);
        if (results.length >= limit) break;
      }
    }

    return results;
  },
});

export const undoLastSelection = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);

    const mostRecent = await ctx.db
      .query('selections')
      .withIndex('by_user_createdAt', (q) => q.eq('userId', user._id))
      .order('desc')
      .first();

    if (!mostRecent) {
      return null;
    }

    const name = await ctx.db.get(mostRecent.nameId);

    // If undoing a like, remove the corresponding match
    if (mostRecent.selectionType === 'like' && user.partnerId) {
      await deleteMatchForName(ctx, user._id, user.partnerId, mostRecent.nameId);
    }

    await ctx.db.delete(mostRecent._id);

    // Counter sync (#183)
    const counterType = counterTypeFor(mostRecent.selectionType);
    if (counterType) {
      await adjustCounters(ctx, user, { [counterType]: -1 });
    }

    return {
      deletedSelectionId: mostRecent._id,
      nameId: mostRecent.nameId,
      name: name,
      selectionType: mostRecent.selectionType,
    };
  },
});

export const getSelectionStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;

    // (#183) Read running counters from the user row instead of collecting
    // every selection on every render of the explore screen's count pill.
    // Counters can be undefined for users predating this field — fall back
    // to a one-time count, but the next mutation will backfill.
    if (
      user.likedCount !== undefined &&
      user.rejectedCount !== undefined &&
      user.skippedCount !== undefined
    ) {
      const liked = user.likedCount;
      const rejected = user.rejectedCount;
      const skipped = user.skippedCount;
      return { liked, rejected, skipped, total: liked + rejected + skipped };
    }

    const [likedDocs, rejectedDocs, skippedDocs] = await Promise.all([
      ctx.db
        .query('selections')
        .withIndex('by_user_type', (q) => q.eq('userId', user._id).eq('selectionType', 'like'))
        .collect(),
      ctx.db
        .query('selections')
        .withIndex('by_user_type', (q) => q.eq('userId', user._id).eq('selectionType', 'reject'))
        .collect(),
      ctx.db
        .query('selections')
        .withIndex('by_user_type', (q) => q.eq('userId', user._id).eq('selectionType', 'skip'))
        .collect(),
    ]);

    const liked = likedDocs.length;
    const rejected = rejectedDocs.length;
    const skipped = skippedDocs.length;

    return { liked, rejected, skipped, total: liked + rejected + skipped };
  },
});

/**
 * Paginated liked names (#170). Returns one page at a time so engaged users
 * with hundreds of likes don't blow up Convex's 32k row limit and the
 * dashboard's render footprint stays bounded.
 *
 * Server-side sort: by liked-at via the by_user_type index. Name sort and
 * text search were dropped from the dashboard when pagination landed —
 * they don't fit a streaming-page model.
 *
 * Free-tier gating happens client-side based on getSelectionStats counts;
 * the dashboard refuses to fetch past the cap so the server doesn't need
 * to enforce it here.
 */
export const getLikedNamesPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    sortBy: v.optional(v.union(v.literal('liked_newest'), v.literal('liked_oldest'))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      return { page: [], isDone: true, continueCursor: '' };
    }

    const order = args.sortBy === 'liked_oldest' ? 'asc' : 'desc';
    const result = await ctx.db
      .query('selections')
      .withIndex('by_user_type', (q) => q.eq('userId', user._id).eq('selectionType', 'like'))
      .order(order)
      .paginate(args.paginationOpts);

    const nameIds = [...new Set(result.page.map((s) => s.nameId))];
    const names = await Promise.all(nameIds.map((id) => ctx.db.get(id)));
    const nameMap = new Map(nameIds.map((id, i) => [id, names[i]]));

    const hydrated = result.page
      .map((s) => ({
        selectionId: s._id,
        likedAt: s.createdAt,
        name: nameMap.get(s.nameId) ?? null,
      }))
      .filter(
        (
          item,
        ): item is {
          selectionId: Id<'selections'>;
          likedAt: number;
          name: NonNullable<typeof item.name>;
        } => item.name !== null,
      );

    return {
      page: hydrated,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const removeFromLiked = mutation({
  args: {
    selectionId: v.id('selections'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const selection = await ctx.db.get(args.selectionId);
    if (!selection) {
      throw new Error('Selection not found');
    }

    if (selection.userId !== user._id) {
      throw new Error('Not authorized to remove this selection');
    }

    // Delete corresponding match if the user has a partner
    if (user.partnerId) {
      await deleteMatchForName(ctx, user._id, user.partnerId, selection.nameId);
    }

    await ctx.db.delete(args.selectionId);

    // Counter sync (#183)
    const counterType = counterTypeFor(selection.selectionType);
    if (counterType) {
      await adjustCounters(ctx, user, { [counterType]: -1 });
    }

    return { success: true };
  },
});

/**
 * Paginated rejected names (#170). See getLikedNamesPaginated for shape
 * rationale. No free-tier gate — rejected names aren't capped.
 */
export const getRejectedNamesPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    sortBy: v.optional(v.union(v.literal('rejected_newest'), v.literal('rejected_oldest'))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      return { page: [], isDone: true, continueCursor: '' };
    }

    const order = args.sortBy === 'rejected_oldest' ? 'asc' : 'desc';
    const result = await ctx.db
      .query('selections')
      .withIndex('by_user_type', (q) => q.eq('userId', user._id).eq('selectionType', 'reject'))
      .order(order)
      .paginate(args.paginationOpts);

    const nameIds = [...new Set(result.page.map((s) => s.nameId))];
    const names = await Promise.all(nameIds.map((id) => ctx.db.get(id)));
    const nameMap = new Map(nameIds.map((id, i) => [id, names[i]]));

    const hydrated = result.page
      .map((s) => ({
        selectionId: s._id,
        rejectedAt: s.createdAt,
        name: nameMap.get(s.nameId) ?? null,
      }))
      .filter(
        (
          item,
        ): item is {
          selectionId: Id<'selections'>;
          rejectedAt: number;
          name: NonNullable<typeof item.name>;
        } => item.name !== null,
      );

    return {
      page: hydrated,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const restoreToQueue = mutation({
  args: {
    selectionId: v.id('selections'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const selection = await ctx.db.get(args.selectionId);
    if (!selection) {
      throw new Error('Selection not found');
    }

    if (selection.userId !== user._id) {
      throw new Error('Not authorized to restore this selection');
    }

    await ctx.db.delete(args.selectionId);

    // Counter sync (#183)
    const counterType = counterTypeFor(selection.selectionType);
    if (counterType) {
      await adjustCounters(ctx, user, { [counterType]: -1 });
    }

    return { success: true };
  },
});

export const bulkDeleteSelections = mutation({
  args: {
    selectionIds: v.array(v.id('selections')),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    let deletedCount = 0;
    const deltas: Partial<Record<'like' | 'reject' | 'skip', number>> = {};
    for (const selectionId of args.selectionIds) {
      const selection = await ctx.db.get(selectionId);
      if (!selection || selection.userId !== user._id) continue;

      if (selection.selectionType === 'like' && user.partnerId) {
        await deleteMatchForName(ctx, user._id, user.partnerId, selection.nameId);
      }

      await ctx.db.delete(selectionId);
      deletedCount++;

      const counterType = counterTypeFor(selection.selectionType);
      if (counterType) {
        deltas[counterType] = (deltas[counterType] ?? 0) - 1;
      }
    }

    // Counter sync (#183) — single batched user-row patch instead of per item.
    if (Object.keys(deltas).length > 0) {
      await adjustCounters(ctx, user, deltas);
    }

    return { success: true, deletedCount };
  },
});

export const bulkHideSelections = mutation({
  args: {
    selectionIds: v.array(v.id('selections')),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const now = Date.now();

    let hiddenCount = 0;
    const deltas: Partial<Record<'like' | 'reject' | 'skip', number>> = {};
    for (const selectionId of args.selectionIds) {
      const selection = await ctx.db.get(selectionId);
      if (!selection || selection.userId !== user._id) continue;

      if (selection.selectionType === 'like' && user.partnerId) {
        await deleteMatchForName(ctx, user._id, user.partnerId, selection.nameId);
      }

      // Hidden doesn't count toward stats — decrement the original type
      // exactly like a delete (#183).
      const counterType = counterTypeFor(selection.selectionType);
      if (counterType) {
        deltas[counterType] = (deltas[counterType] ?? 0) - 1;
      }

      await ctx.db.patch(selectionId, {
        selectionType: 'hidden',
        updatedAt: now,
      });
      hiddenCount++;
    }

    if (Object.keys(deltas).length > 0) {
      await adjustCounters(ctx, user, deltas);
    }

    return { success: true, hiddenCount };
  },
});

export const hidePermanently = mutation({
  args: {
    selectionId: v.id('selections'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const selection = await ctx.db.get(args.selectionId);
    if (!selection) {
      throw new Error('Selection not found');
    }

    if (selection.userId !== user._id) {
      throw new Error('Not authorized to hide this selection');
    }

    if (selection.selectionType === 'like' && user.partnerId) {
      await deleteMatchForName(ctx, user._id, user.partnerId, selection.nameId);
    }

    // Counter sync (#183) — hidden doesn't count toward stats.
    const counterType = counterTypeFor(selection.selectionType);
    if (counterType) {
      await adjustCounters(ctx, user, { [counterType]: -1 });
    }

    await ctx.db.patch(args.selectionId, {
      selectionType: 'hidden',
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
