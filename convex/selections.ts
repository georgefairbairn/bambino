import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { mutation, query, QueryCtx, MutationCtx } from './_generated/server';
import { Doc, Id } from './_generated/dataModel';
import { getEffectivePremiumStatusHelper } from './premium';
import { convexError } from './errors';

const FREE_TIER_SWIPE_LIMIT = 25;
// Cap on selectionIds accepted by the bulk mutations (#203). The dashboard's
// "select all" only ever covers the loaded list, so 200 is generous while
// still bounding the sequential per-item DB calls a single mutation makes.
const BULK_SELECTION_LIMIT = 200;

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
 * Recompute all three counters from the selections table and write them.
 * Unlike ensureCountersBackfilled this ALWAYS recomputes — use it after a
 * bulk mutation where delta tracking is error-prone, and to self-heal any
 * historical drift. Call AFTER the bulk inserts/deletes have run.
 */
async function recomputeCounters(ctx: MutationCtx, userId: Id<'users'>): Promise<void> {
  const [likes, rejects, skips] = await Promise.all([
    ctx.db
      .query('selections')
      .withIndex('by_user_type', (q) => q.eq('userId', userId).eq('selectionType', 'like'))
      .collect(),
    ctx.db
      .query('selections')
      .withIndex('by_user_type', (q) => q.eq('userId', userId).eq('selectionType', 'reject'))
      .collect(),
    ctx.db
      .query('selections')
      .withIndex('by_user_type', (q) => q.eq('userId', userId).eq('selectionType', 'skip'))
      .collect(),
  ]);
  await ctx.db.patch(userId, {
    likedCount: likes.length,
    rejectedCount: rejects.length,
    skippedCount: skips.length,
  });
}

/**
 * Apply a set of delta counter changes to the user row. Pass positive ints
 * for inserts, negative for deletes. Selection types not in deltas are
 * untouched. Floors at 0 to defend against any drift.
 *
 * IMPORTANT: pass the user document as it was *before* the mutation's
 * inserts/deletes ran. Otherwise the counter math is wrong: callers
 * pre-backfill via ensureCountersBackfilled at the TOP of their handler
 * (before any selection writes) and pass that filled user here.
 */
async function adjustCounters(
  ctx: MutationCtx,
  user: Doc<'users'>,
  deltas: Partial<Record<'like' | 'reject' | 'skip', number>>,
): Promise<void> {
  const patch: Partial<Pick<Doc<'users'>, 'likedCount' | 'rejectedCount' | 'skippedCount'>> = {};
  for (const [type, delta] of Object.entries(deltas) as ['like' | 'reject' | 'skip', number][]) {
    if (!delta) continue;
    const field = COUNTER_FIELDS[type];
    patch[field] = Math.max(0, (user[field] ?? 0) + delta);
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
    throw convexError('UNAUTHENTICATED', 'Not authenticated');
  }

  // #164: tolerant read — a stray duplicate clerkId row shouldn't throw here.
  // createOrUpdateUser self-heals duplicates; this keeps the oldest meanwhile.
  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .first();

  if (!user) {
    throw convexError('USER_NOT_FOUND', 'User not found');
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

  // #164: collect + delete-all rather than .unique() + delete-one. A duplicate
  // match row (legacy data) would make .unique() throw and leave an orphan;
  // deleting every matching row is both throw-safe and the correct cleanup.
  const matches = await ctx.db
    .query('matches')
    .withIndex('by_name_users', (q) =>
      q.eq('nameId', nameId).eq('user1Id', user1Id).eq('user2Id', user2Id),
    )
    .collect();

  for (const match of matches) {
    await ctx.db.delete(match._id);
  }
}

async function getCurrentUserOrNull(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  // #164: tolerant read — see getCurrentUserOrThrow.
  return await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .first();
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
  // Check if partner has liked this name. #164: .first() — a duplicate
  // partner selection row shouldn't throw and block match creation.
  const partnerSelection = await ctx.db
    .query('selections')
    .withIndex('by_user_name', (q) => q.eq('userId', partnerId).eq('nameId', nameId))
    .first();

  if (!partnerSelection || partnerSelection.selectionType !== 'like') {
    return null;
  }

  // Check if match already exists (in either user order)
  const [user1Id, user2Id] =
    likingUserId < partnerId ? [likingUserId, partnerId] : [partnerId, likingUserId];

  // #164: .first() not .unique() — tolerant of a pre-existing duplicate match.
  const existingMatch = await ctx.db
    .query('matches')
    .withIndex('by_name_users', (q) =>
      q.eq('nameId', nameId).eq('user1Id', user1Id).eq('user2Id', user2Id),
    )
    .first();

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

  // #164: the highest-impact race — both partners liking the same name at the
  // same instant. Convex OCC should serialize these (both read+write the same
  // by_name_users range), but indexes aren't unique constraints, so re-read
  // and collapse to the oldest match if two rows exist. Return the survivor.
  const afterInsert = await ctx.db
    .query('matches')
    .withIndex('by_name_users', (q) =>
      q.eq('nameId', nameId).eq('user1Id', user1Id).eq('user2Id', user2Id),
    )
    .collect();
  let survivingMatchId = matchId;
  if (afterInsert.length > 1) {
    afterInsert.sort((a, b) => a._creationTime - b._creationTime);
    const survivor = afterInsert[0];
    if (survivor) survivingMatchId = survivor._id;
    for (let i = 1; i < afterInsert.length; i++) {
      const dup = afterInsert[i];
      if (dup) await ctx.db.delete(dup._id);
    }
    // A concurrent writer beat us to it — they already surfaced the match toast.
    if (survivingMatchId !== matchId) {
      return null;
    }
  }

  const name = await ctx.db.get(nameId);

  return {
    matchId: survivingMatchId,
    name,
    matchedAt: now,
    isFirstMatch: existingPartnerMatch === null,
  };
}

export const recordSelection = mutation({
  args: {
    nameId: v.id('names'),
    selectionType: v.union(v.literal('like'), v.literal('reject'), v.literal('skip')),
  },
  handler: async (ctx, args) => {
    let user = await getCurrentUserOrThrow(ctx);
    // Backfill running counters BEFORE any mutation runs — otherwise the
    // backfill's post-mutation collect would double-count this write (#183).
    user = await ensureCountersBackfilled(ctx, user);

    // Free tier: limit total swipes via a monotonic lifetime counter (#165).
    // Using a counter that never decrements (vs counting current selections)
    // means undoLastSelection can't be used to ratchet back under the cap
    // and swipe forever. Backfill once from the current selection count for
    // users predating the field.
    const premiumStatus = await getEffectivePremiumStatusHelper(ctx, user._id);
    let lifetimeSwipeCount = user.lifetimeSwipeCount;
    if (lifetimeSwipeCount === undefined) {
      const existing = await ctx.db
        .query('selections')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .collect();
      lifetimeSwipeCount = existing.length;
      // Persist the backfill immediately, even if we're about to reject for
      // the cap below. Otherwise a capped user whose field was never written
      // could undo (lowering the current count) and the next call would
      // backfill to the lowered number — reopening the bypass (#165).
      await ctx.db.patch(user._id, { lifetimeSwipeCount });
    }
    if (!premiumStatus.isPremium && lifetimeSwipeCount >= FREE_TIER_SWIPE_LIMIT) {
      return { error: 'FREE_TIER_SWIPE_LIMIT' as const };
    }

    // #164: collect + heal rather than .unique(). A duplicate (user, name)
    // selection row (legacy data) would make .unique() throw here and in
    // getSwipeQueue's isAlreadySwiped, breaking the swipe screen. Keep the
    // oldest, delete the rest, and treat the oldest as the existing row.
    const existingRows = await ctx.db
      .query('selections')
      .withIndex('by_user_name', (q) => q.eq('userId', user._id).eq('nameId', args.nameId))
      .collect();
    existingRows.sort((a, b) => a._creationTime - b._creationTime);
    const existingSelection = existingRows[0] ?? null;
    for (let i = 1; i < existingRows.length; i++) {
      const dup = existingRows[i];
      if (dup) await ctx.db.delete(dup._id);
    }

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
        categoryMask?: number;
      } = {
        selectionType: args.selectionType,
        updatedAt: now,
      };
      if (
        !existingSelection.origin ||
        !existingSelection.gender ||
        existingSelection.categoryMask === undefined
      ) {
        const nameDoc = await ctx.db.get(args.nameId);
        if (nameDoc) {
          patch.origin = nameDoc.origin;
          patch.gender = nameDoc.gender;
          patch.categoryMask = nameDoc.categoryMask ?? 0;
        }
      }
      await ctx.db.patch(existingSelection._id, patch);

      // (Re-swiping an already-recorded name doesn't consume a new swipe, so
      // lifetimeSwipeCount isn't incremented here. Its backfill was already
      // persisted above.)

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
      categoryMask: nameDoc?.categoryMask,
      createdAt: now,
      updatedAt: now,
    });

    // #164 belt-and-suspenders: re-read by (user, name) and collapse to the
    // oldest if a concurrent insert also won. OCC should prevent this (both
    // touch the same by_user_name range), but indexes aren't unique. If our
    // row lost, delete it and bail without double-counting the swipe.
    const afterInsert = await ctx.db
      .query('selections')
      .withIndex('by_user_name', (q) => q.eq('userId', user._id).eq('nameId', args.nameId))
      .collect();
    if (afterInsert.length > 1) {
      afterInsert.sort((a, b) => a._creationTime - b._creationTime);
      const survivor = afterInsert[0];
      for (let i = 1; i < afterInsert.length; i++) {
        const dup = afterInsert[i];
        if (dup) await ctx.db.delete(dup._id);
      }
      if (survivor && survivor._id !== selectionId) {
        // A concurrent call already recorded this swipe and did its own
        // counting. Don't increment lifetime/counters again.
        return { selectionId: survivor._id, match: null };
      }
    }

    // A genuinely new swipe — advance the monotonic lifetime counter (#165).
    await ctx.db.patch(user._id, { lifetimeSwipeCount: lifetimeSwipeCount + 1 });

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
      // #164: .first() — a duplicate selection row shouldn't throw and crash
      // the swipe queue. recordSelection self-heals duplicates on next write.
      const existing = await ctx.db
        .query('selections')
        .withIndex('by_user_name', (q) => q.eq('userId', user._id).eq('nameId', nameId))
        .first();
      return existing !== null;
    };

    const genderFilter = user.genderFilter ?? 'both';
    const originFilter = user.originFilter;
    const genderValue = genderFilter === 'boy' ? 'male' : genderFilter === 'girl' ? 'female' : null;
    const originSet = originFilter && originFilter.length > 0 ? new Set(originFilter) : null;
    const categoryFilter = user.categoryFilter;
    const categorySet =
      categoryFilter && categoryFilter.length > 0 ? new Set(categoryFilter) : null;

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
      if (categorySet && !(name.categories ?? []).some((c) => categorySet.has(c))) return false;
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

/**
 * Which of the given names has the current user's PARTNER already liked?
 * Powers optimistic match detection on the swipe screen: if the partner
 * already liked a queued name, the client shows the match banner the instant
 * the user swipes right, instead of waiting for recordSelection. Reactive and
 * bounded to the rendered cards, so it's a handful of indexed reads.
 */
export const getPartnerLikedNames = query({
  args: {
    nameIds: v.array(v.id('names')),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user || !user.partnerId) return [];

    const partnerId = user.partnerId;
    const ids = args.nameIds.slice(0, BULK_SELECTION_LIMIT);

    const results = await Promise.all(
      ids.map(async (nameId) => {
        const sel = await ctx.db
          .query('selections')
          .withIndex('by_user_name', (q) => q.eq('userId', partnerId).eq('nameId', nameId))
          .first();
        return sel?.selectionType === 'like' ? nameId : null;
      }),
    );

    return results.filter((id): id is Id<'names'> => id !== null);
  },
});

export const undoLastSelection = mutation({
  args: {},
  handler: async (ctx) => {
    let user = await getCurrentUserOrThrow(ctx);
    user = await ensureCountersBackfilled(ctx, user);

    // Order by updatedAt so "undo" targets the most recently *actioned*
    // selection. Re-swiping an old name patches updatedAt (not createdAt),
    // so ordering by createdAt would undo the wrong row (#225).
    const mostRecent = await ctx.db
      .query('selections')
      .withIndex('by_user_updatedAt', (q) => q.eq('userId', user._id))
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
 * Selection state for a set of names (#292). Powers the Shortlist
 * search-to-add results: each search hit needs to know whether the current
 * user already has a selection for it (so the row can show a remove vs add
 * affordance) and, if so, the selectionId to act on. Bounded to
 * BULK_SELECTION_LIMIT name ids so a single query can't fan out unboundedly.
 */
export const getSelectionStatesForNames = query({
  args: {
    nameIds: v.array(v.id('names')),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    const ids = args.nameIds.slice(0, BULK_SELECTION_LIMIT);
    const states = await Promise.all(
      ids.map(async (nameId) => {
        // collect + oldest, mirroring recordSelection's dup-healing read so a
        // legacy duplicate (user, name) row doesn't throw .unique() here (#164).
        const rows = await ctx.db
          .query('selections')
          .withIndex('by_user_name', (q) => q.eq('userId', user._id).eq('nameId', nameId))
          .collect();
        const row = rows.sort((a, b) => a._creationTime - b._creationTime)[0];
        if (!row) return null;
        return {
          nameId,
          selectionType: row.selectionType,
          selectionId: row._id,
        };
      }),
    );

    return states.filter(
      (
        s,
      ): s is {
        nameId: Id<'names'>;
        selectionType: Doc<'selections'>['selectionType'];
        selectionId: Id<'selections'>;
      } => s !== null,
    );
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
    let user = await getCurrentUserOrThrow(ctx);
    user = await ensureCountersBackfilled(ctx, user);

    const selection = await ctx.db.get(args.selectionId);
    if (!selection) {
      throw convexError('SELECTION_NOT_FOUND', 'Selection not found');
    }

    if (selection.userId !== user._id) {
      throw convexError('NOT_AUTHORIZED', 'Not authorized to remove this selection');
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
    let user = await getCurrentUserOrThrow(ctx);
    user = await ensureCountersBackfilled(ctx, user);

    const selection = await ctx.db.get(args.selectionId);
    if (!selection) {
      throw convexError('SELECTION_NOT_FOUND', 'Selection not found');
    }

    if (selection.userId !== user._id) {
      throw convexError('NOT_AUTHORIZED', 'Not authorized to restore this selection');
    }

    // Defense in depth (#173): restoreToQueue is only wired up for rejected
    // names today (which have no match), but if it's ever called on a like
    // we must delete the corresponding match — same as removeFromLiked —
    // or we'd leave an orphan match row that breaks match-toast suppression.
    if (selection.selectionType === 'like' && user.partnerId) {
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

// NOTE on atomicity (#230): Convex mutations are a single transaction. If
// any per-item call throws, the WHOLE mutation rolls back — nothing is
// deleted/hidden. The returned count is therefore only meaningful on full
// success; callers should treat a thrown error as "nothing happened", not a
// partial result. We intentionally don't try/catch per item: silently
// swallowing a mid-batch error would leave counts and matches inconsistent.

export const bulkDeleteSelections = mutation({
  args: {
    selectionIds: v.array(v.id('selections')),
  },
  handler: async (ctx, args) => {
    if (args.selectionIds.length > BULK_SELECTION_LIMIT) {
      throw convexError(
        'BULK_LIMIT_EXCEEDED',
        `Cannot delete more than ${BULK_SELECTION_LIMIT} selections at once`,
      );
    }
    const user = await getCurrentUserOrThrow(ctx);

    let deletedCount = 0;
    for (const selectionId of args.selectionIds) {
      const selection = await ctx.db.get(selectionId);
      if (!selection || selection.userId !== user._id) continue;

      if (selection.selectionType === 'like' && user.partnerId) {
        await deleteMatchForName(ctx, user._id, user.partnerId, selection.nameId);
      }

      await ctx.db.delete(selectionId);
      deletedCount++;
    }

    // Recompute counters from scratch after the batch (#183). Bulk ops are
    // rare and already O(n), so the extra collect is cheap relative to the
    // deletes — and recomputing self-heals any historical counter drift
    // instead of compounding it via deltas.
    await recomputeCounters(ctx, user._id);

    return { success: true, deletedCount };
  },
});

export const bulkHideSelections = mutation({
  args: {
    selectionIds: v.array(v.id('selections')),
  },
  handler: async (ctx, args) => {
    if (args.selectionIds.length > BULK_SELECTION_LIMIT) {
      throw convexError(
        'BULK_LIMIT_EXCEEDED',
        `Cannot hide more than ${BULK_SELECTION_LIMIT} selections at once`,
      );
    }
    const user = await getCurrentUserOrThrow(ctx);
    const now = Date.now();

    let hiddenCount = 0;
    for (const selectionId of args.selectionIds) {
      const selection = await ctx.db.get(selectionId);
      if (!selection || selection.userId !== user._id) continue;

      if (selection.selectionType === 'like' && user.partnerId) {
        await deleteMatchForName(ctx, user._id, user.partnerId, selection.nameId);
      }

      await ctx.db.patch(selectionId, {
        selectionType: 'hidden',
        updatedAt: now,
      });
      hiddenCount++;
    }

    // Recompute from scratch after the batch (#183) — see bulkDeleteSelections.
    await recomputeCounters(ctx, user._id);

    return { success: true, hiddenCount };
  },
});

export const hidePermanently = mutation({
  args: {
    selectionId: v.id('selections'),
  },
  handler: async (ctx, args) => {
    let user = await getCurrentUserOrThrow(ctx);
    user = await ensureCountersBackfilled(ctx, user);

    const selection = await ctx.db.get(args.selectionId);
    if (!selection) {
      throw convexError('SELECTION_NOT_FOUND', 'Selection not found');
    }

    if (selection.userId !== user._id) {
      throw convexError('NOT_AUTHORIZED', 'Not authorized to hide this selection');
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
