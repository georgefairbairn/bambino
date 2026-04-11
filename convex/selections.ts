import { v } from 'convex/values';
import { mutation, query, QueryCtx, MutationCtx } from './_generated/server';
import { Doc, Id } from './_generated/dataModel';
import { getEffectivePremiumStatusHelper } from './premium';

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

  // Count existing matches between these two users to determine if this is the first
  const existingMatchesAsUser1 = await ctx.db
    .query('matches')
    .withIndex('by_user1', (q) => q.eq('user1Id', user1Id))
    .collect();
  const partnerMatchCount = existingMatchesAsUser1.filter((m) => m.user2Id === user2Id).length;

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

  return { matchId, name, matchedAt: now, isFirstMatch: partnerMatchCount === 0 };
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
      const allSelections = await ctx.db
        .query('selections')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .collect();

      if (allSelections.length >= 25) {
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

      await ctx.db.patch(existingSelection._id, {
        selectionType: args.selectionType,
        updatedAt: now,
      });

      if (args.selectionType === 'like' && user.partnerId) {
        const match = await checkForMatchAndCreate(ctx, args.nameId, user._id, user.partnerId);
        return { selectionId: existingSelection._id, match };
      }

      return { selectionId: existingSelection._id, match: null };
    }

    const selectionId = await ctx.db.insert('selections', {
      userId: user._id,
      nameId: args.nameId,
      selectionType: args.selectionType,
      createdAt: now,
      updatedAt: now,
    });

    if (args.selectionType === 'like' && user.partnerId) {
      const match = await checkForMatchAndCreate(ctx, args.nameId, user._id, user.partnerId);
      return { selectionId, match };
    }

    return { selectionId, match: null };
  },
});

export const getSwipeQueue = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    const limit = args.limit ?? 50;

    const userSelections = await ctx.db
      .query('selections')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    const swipedNameIds = new Set(userSelections.map((s) => s.nameId));

    const genderFilter = user.genderFilter ?? 'both';
    const originFilter = user.originFilter;
    const hasOriginFilter = originFilter !== undefined && originFilter.length > 0;
    const originSet = hasOriginFilter ? new Set(originFilter) : null;

    const genderValue = genderFilter === 'boy' ? 'male' : genderFilter === 'girl' ? 'female' : null;

    const namesQuery =
      genderValue !== null
        ? ctx.db.query('names').withIndex('by_gender', (q) => q.eq('gender', genderValue))
        : ctx.db.query('names');

    const results: Doc<'names'>[] = [];

    for await (const name of namesQuery) {
      if (results.length >= limit) break;
      if (swipedNameIds.has(name._id)) continue;
      if (originSet && !originSet.has(name.origin)) continue;
      results.push(name);
    }

    return results;
  },
});

export const undoLastSelection = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);

    const userSelections = await ctx.db
      .query('selections')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    if (userSelections.length === 0) {
      return null;
    }

    const mostRecent = userSelections.reduce((latest, current) =>
      current.createdAt > latest.createdAt ? current : latest,
    );

    const name = await ctx.db.get(mostRecent.nameId);

    // If undoing a like, remove the corresponding match
    if (mostRecent.selectionType === 'like' && user.partnerId) {
      await deleteMatchForName(ctx, user._id, user.partnerId, mostRecent.nameId);
    }

    await ctx.db.delete(mostRecent._id);

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

    const userSelections = await ctx.db
      .query('selections')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    const stats = {
      liked: 0,
      rejected: 0,
      skipped: 0,
      total: userSelections.length,
    };

    for (const selection of userSelections) {
      if (selection.selectionType === 'like') {
        stats.liked++;
      } else if (selection.selectionType === 'reject') {
        stats.rejected++;
      } else if (selection.selectionType === 'skip') {
        stats.skipped++;
      }
    }

    return stats;
  },
});

export const getLikedNames = query({
  args: {
    search: v.optional(v.string()),
    sortBy: v.optional(
      v.union(
        v.literal('name_asc'),
        v.literal('name_desc'),
        v.literal('liked_newest'),
        v.literal('liked_oldest'),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    const likedSelections = await ctx.db
      .query('selections')
      .withIndex('by_user_type', (q) => q.eq('userId', user._id).eq('selectionType', 'like'))
      .collect();

    const uniqueNameIds = [...new Set(likedSelections.map((s) => s.nameId))];
    const nameDocsArray = await Promise.all(uniqueNameIds.map((id) => ctx.db.get(id)));
    const nameMap = new Map(uniqueNameIds.map((id, i) => [id, nameDocsArray[i]]));

    const likedNamesWithDetails = likedSelections.map((selection) => ({
      selectionId: selection._id,
      likedAt: selection.createdAt,
      name: nameMap.get(selection.nameId) ?? null,
    }));

    let results = likedNamesWithDetails.filter(
      (
        item,
      ): item is {
        selectionId: Id<'selections'>;
        likedAt: number;
        name: NonNullable<typeof item.name>;
      } => item.name !== null,
    );

    if (args.search) {
      const searchLower = args.search.toLowerCase();
      results = results.filter((item) => item.name.name.toLowerCase().includes(searchLower));
    }

    const sortBy = args.sortBy ?? 'liked_newest';
    switch (sortBy) {
      case 'name_asc':
        results.sort((a, b) => a.name.name.localeCompare(b.name.name));
        break;
      case 'name_desc':
        results.sort((a, b) => b.name.name.localeCompare(a.name.name));
        break;
      case 'liked_newest':
        results.sort((a, b) => b.likedAt - a.likedAt);
        break;
      case 'liked_oldest':
        results.sort((a, b) => a.likedAt - b.likedAt);
        break;
    }

    return results;
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

    return { success: true };
  },
});

export const getRejectedNames = query({
  args: {
    search: v.optional(v.string()),
    sortBy: v.optional(
      v.union(
        v.literal('name_asc'),
        v.literal('name_desc'),
        v.literal('rejected_newest'),
        v.literal('rejected_oldest'),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    const rejectedSelections = await ctx.db
      .query('selections')
      .withIndex('by_user_type', (q) => q.eq('userId', user._id).eq('selectionType', 'reject'))
      .collect();

    const uniqueNameIds = [...new Set(rejectedSelections.map((s) => s.nameId))];
    const nameDocsArray = await Promise.all(uniqueNameIds.map((id) => ctx.db.get(id)));
    const nameMap = new Map(uniqueNameIds.map((id, i) => [id, nameDocsArray[i]]));

    const rejectedNamesWithDetails = rejectedSelections.map((selection) => ({
      selectionId: selection._id,
      rejectedAt: selection.createdAt,
      name: nameMap.get(selection.nameId) ?? null,
    }));

    let results = rejectedNamesWithDetails.filter(
      (
        item,
      ): item is {
        selectionId: Id<'selections'>;
        rejectedAt: number;
        name: NonNullable<typeof item.name>;
      } => item.name !== null,
    );

    if (args.search) {
      const searchLower = args.search.toLowerCase();
      results = results.filter((item) => item.name.name.toLowerCase().includes(searchLower));
    }

    const sortBy = args.sortBy ?? 'rejected_newest';
    switch (sortBy) {
      case 'name_asc':
        results.sort((a, b) => a.name.name.localeCompare(b.name.name));
        break;
      case 'name_desc':
        results.sort((a, b) => b.name.name.localeCompare(a.name.name));
        break;
      case 'rejected_newest':
        results.sort((a, b) => b.rejectedAt - a.rejectedAt);
        break;
      case 'rejected_oldest':
        results.sort((a, b) => a.rejectedAt - b.rejectedAt);
        break;
    }

    return results;
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

    return { success: true };
  },
});

export const bulkDeleteSelections = mutation({
  args: {
    selectionIds: v.array(v.id('selections')),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    for (const selectionId of args.selectionIds) {
      const selection = await ctx.db.get(selectionId);
      if (!selection || selection.userId !== user._id) continue;

      if (selection.selectionType === 'like' && user.partnerId) {
        await deleteMatchForName(ctx, user._id, user.partnerId, selection.nameId);
      }

      await ctx.db.delete(selectionId);
    }

    return { success: true, count: args.selectionIds.length };
  },
});

export const bulkHideSelections = mutation({
  args: {
    selectionIds: v.array(v.id('selections')),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const now = Date.now();

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
    }

    return { success: true, count: args.selectionIds.length };
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

    await ctx.db.patch(args.selectionId, {
      selectionType: 'hidden',
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
