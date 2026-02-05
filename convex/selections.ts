import { v } from 'convex/values';
import { mutation, query, QueryCtx, MutationCtx } from './_generated/server';
import { Id, Doc } from './_generated/dataModel';

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

async function isSearchMemberOrThrow(
  ctx: QueryCtx | MutationCtx,
  searchId: Id<'searches'>,
  userId: Id<'users'>,
) {
  const membership = await ctx.db
    .query('searchMembers')
    .withIndex('by_search_and_user', (q) => q.eq('searchId', searchId).eq('userId', userId))
    .unique();

  if (!membership) {
    throw new Error('Not a member of this search');
  }

  return membership;
}

async function isSearchMember(
  ctx: QueryCtx | MutationCtx,
  searchId: Id<'searches'>,
  userId: Id<'users'>,
) {
  const membership = await ctx.db
    .query('searchMembers')
    .withIndex('by_search_and_user', (q) => q.eq('searchId', searchId).eq('userId', userId))
    .unique();

  return membership;
}

// Check if a match already exists for this search and name
async function matchExists(
  ctx: QueryCtx | MutationCtx,
  searchId: Id<'searches'>,
  nameId: Id<'names'>,
): Promise<boolean> {
  const existing = await ctx.db
    .query('matches')
    .withIndex('by_search_name', (q) => q.eq('searchId', searchId).eq('nameId', nameId))
    .unique();

  return existing !== null;
}

// Check for a match when a user likes a name
// Returns the match details if one was created, null otherwise
async function checkForMatchAndCreate(
  ctx: MutationCtx,
  searchId: Id<'searches'>,
  nameId: Id<'names'>,
  likingUserId: Id<'users'>,
): Promise<{ matchId: Id<'matches'>; name: Doc<'names'> | null; matchedAt: number } | null> {
  // Check if match already exists
  if (await matchExists(ctx, searchId, nameId)) {
    return null;
  }

  // Get all search members
  const searchMembers = await ctx.db
    .query('searchMembers')
    .withIndex('by_search_id', (q) => q.eq('searchId', searchId))
    .collect();

  // If only one member (the liker), no match possible
  if (searchMembers.length < 2) {
    return null;
  }

  // Get other members who have liked this name
  const otherMembers = searchMembers.filter((m) => m.userId !== likingUserId);

  for (const member of otherMembers) {
    // Check if this member has liked the same name
    const theirSelection = await ctx.db
      .query('selections')
      .withIndex('by_search_name', (q) => q.eq('searchId', searchId).eq('nameId', nameId))
      .filter((q) => q.eq(q.field('userId'), member.userId))
      .unique();

    if (theirSelection && theirSelection.selectionType === 'like') {
      // Match found! Create the match record
      const now = Date.now();
      const matchId = await ctx.db.insert('matches', {
        searchId,
        nameId,
        user1Id: likingUserId,
        user2Id: member.userId,
        matchedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      // Get the name details for the response
      const name = await ctx.db.get(nameId);

      return {
        matchId,
        name,
        matchedAt: now,
      };
    }
  }

  return null;
}

export const recordSelection = mutation({
  args: {
    searchId: v.id('searches'),
    nameId: v.id('names'),
    selectionType: v.union(v.literal('like'), v.literal('reject'), v.literal('skip')),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    await isSearchMemberOrThrow(ctx, args.searchId, user._id);

    const existingSelection = await ctx.db
      .query('selections')
      .withIndex('by_search_name', (q) =>
        q.eq('searchId', args.searchId).eq('nameId', args.nameId),
      )
      .filter((q) => q.eq(q.field('userId'), user._id))
      .unique();

    const now = Date.now();

    if (existingSelection) {
      await ctx.db.patch(existingSelection._id, {
        selectionType: args.selectionType,
        updatedAt: now,
      });

      // Check for match if changing to like
      if (args.selectionType === 'like') {
        const match = await checkForMatchAndCreate(ctx, args.searchId, args.nameId, user._id);

        return { selectionId: existingSelection._id, match };
      }

      return { selectionId: existingSelection._id, match: null };
    }

    const selectionId = await ctx.db.insert('selections', {
      searchId: args.searchId,
      userId: user._id,
      nameId: args.nameId,
      selectionType: args.selectionType,
      createdAt: now,
      updatedAt: now,
    });

    // Check for match if this is a like
    if (args.selectionType === 'like') {
      const match = await checkForMatchAndCreate(ctx, args.searchId, args.nameId, user._id);

      return { selectionId, match };
    }

    return { selectionId, match: null };
  },
});

export const getSwipeQueue = query({
  args: {
    searchId: v.id('searches'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Check if search exists and user is a member (graceful handling for deleted searches)
    const search = await ctx.db.get(args.searchId);
    if (!search) {
      return [];
    }

    const membership = await isSearchMember(ctx, args.searchId, user._id);
    if (!membership) {
      return [];
    }

    const limit = args.limit ?? 50;

    const userSelections = await ctx.db
      .query('selections')
      .withIndex('by_user_search', (q) => q.eq('userId', user._id).eq('searchId', args.searchId))
      .collect();

    const swipedNameIds = new Set(userSelections.map((s) => s.nameId));

    let namesQuery;
    if (search.genderFilter === 'both') {
      namesQuery = ctx.db.query('names');
    } else {
      namesQuery = ctx.db
        .query('names')
        .withIndex('by_gender', (q) => q.eq('gender', search.genderFilter));
    }

    const allNames = await namesQuery.collect();

    const filteredNames = allNames.filter((name) => {
      if (swipedNameIds.has(name._id)) {
        return false;
      }

      if (
        search.originFilter !== undefined &&
        search.originFilter.length > 0 &&
        !search.originFilter.includes(name.origin)
      ) {
        return false;
      }

      return true;
    });

    return filteredNames.slice(0, limit);
  },
});

export const undoLastSelection = mutation({
  args: {
    searchId: v.id('searches'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    await isSearchMemberOrThrow(ctx, args.searchId, user._id);

    const userSelections = await ctx.db
      .query('selections')
      .withIndex('by_user_search', (q) => q.eq('userId', user._id).eq('searchId', args.searchId))
      .collect();

    if (userSelections.length === 0) {
      return null;
    }

    const mostRecent = userSelections.reduce((latest, current) =>
      current.createdAt > latest.createdAt ? current : latest,
    );

    const name = await ctx.db.get(mostRecent.nameId);

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
  args: {
    searchId: v.id('searches'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Check if search exists and user is a member (graceful handling for deleted searches)
    const search = await ctx.db.get(args.searchId);
    if (!search) {
      return { liked: 0, rejected: 0, skipped: 0, total: 0 };
    }

    const membership = await isSearchMember(ctx, args.searchId, user._id);
    if (!membership) {
      return { liked: 0, rejected: 0, skipped: 0, total: 0 };
    }

    const userSelections = await ctx.db
      .query('selections')
      .withIndex('by_user_search', (q) => q.eq('userId', user._id).eq('searchId', args.searchId))
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
    searchId: v.id('searches'),
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
    const user = await getCurrentUserOrThrow(ctx);

    // Check if search exists and user is a member
    const search = await ctx.db.get(args.searchId);
    if (!search) {
      return [];
    }

    const membership = await isSearchMember(ctx, args.searchId, user._id);
    if (!membership) {
      return [];
    }

    // Get all liked selections for this user in this search
    const likedSelections = await ctx.db
      .query('selections')
      .withIndex('by_user_search_type', (q) =>
        q.eq('userId', user._id).eq('searchId', args.searchId).eq('selectionType', 'like'),
      )
      .collect();

    // Join with name details
    const likedNamesWithDetails = await Promise.all(
      likedSelections.map(async (selection) => {
        const name = await ctx.db.get(selection.nameId);
        return {
          selectionId: selection._id,
          likedAt: selection.createdAt,
          name: name,
        };
      }),
    );

    // Filter out any null names (in case name was deleted)
    let results = likedNamesWithDetails.filter(
      (
        item,
      ): item is {
        selectionId: Id<'selections'>;
        likedAt: number;
        name: NonNullable<typeof item.name>;
      } => item.name !== null,
    );

    // Apply search filter
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      results = results.filter((item) => item.name.name.toLowerCase().includes(searchLower));
    }

    // Apply sorting
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

    // Get the selection
    const selection = await ctx.db.get(args.selectionId);
    if (!selection) {
      throw new Error('Selection not found');
    }

    // Verify ownership
    if (selection.userId !== user._id) {
      throw new Error('Not authorized to remove this selection');
    }

    // Delete the selection
    await ctx.db.delete(args.selectionId);

    return { success: true };
  },
});

export const getRejectedNames = query({
  args: {
    searchId: v.id('searches'),
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
    const user = await getCurrentUserOrThrow(ctx);

    // Check if search exists and user is a member
    const search = await ctx.db.get(args.searchId);
    if (!search) {
      return [];
    }

    const membership = await isSearchMember(ctx, args.searchId, user._id);
    if (!membership) {
      return [];
    }

    // Get all rejected selections for this user in this search
    const rejectedSelections = await ctx.db
      .query('selections')
      .withIndex('by_user_search_type', (q) =>
        q.eq('userId', user._id).eq('searchId', args.searchId).eq('selectionType', 'reject'),
      )
      .collect();

    // Join with name details
    const rejectedNamesWithDetails = await Promise.all(
      rejectedSelections.map(async (selection) => {
        const name = await ctx.db.get(selection.nameId);
        return {
          selectionId: selection._id,
          rejectedAt: selection.createdAt,
          name: name,
        };
      }),
    );

    // Filter out any null names (in case name was deleted)
    let results = rejectedNamesWithDetails.filter(
      (
        item,
      ): item is {
        selectionId: Id<'selections'>;
        rejectedAt: number;
        name: NonNullable<typeof item.name>;
      } => item.name !== null,
    );

    // Apply search filter
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      results = results.filter((item) => item.name.name.toLowerCase().includes(searchLower));
    }

    // Apply sorting
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

    // Get the selection
    const selection = await ctx.db.get(args.selectionId);
    if (!selection) {
      throw new Error('Selection not found');
    }

    // Verify ownership
    if (selection.userId !== user._id) {
      throw new Error('Not authorized to restore this selection');
    }

    // Delete the selection so name returns to swipe queue
    await ctx.db.delete(args.selectionId);

    return { success: true };
  },
});

export const hidePermanently = mutation({
  args: {
    selectionId: v.id('selections'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Get the selection
    const selection = await ctx.db.get(args.selectionId);
    if (!selection) {
      throw new Error('Selection not found');
    }

    // Verify ownership
    if (selection.userId !== user._id) {
      throw new Error('Not authorized to hide this selection');
    }

    // Update selection type to hidden
    await ctx.db.patch(args.selectionId, {
      selectionType: 'hidden',
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
