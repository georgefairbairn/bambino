import { v } from 'convex/values';
import { mutation, query, QueryCtx, MutationCtx } from './_generated/server';
import { Doc, Id } from './_generated/dataModel';

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

async function getCurrentUserOrNull(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique();
}

// Get all matches involving the user and their partner
async function getPartnershipMatches(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>,
  partnerId: Id<'users'>,
) {
  const matchesAsUser1 = await ctx.db
    .query('matches')
    .withIndex('by_user1', (q) => q.eq('user1Id', userId))
    .collect();

  const matchesAsUser2 = await ctx.db
    .query('matches')
    .withIndex('by_user2', (q) => q.eq('user2Id', userId))
    .collect();

  const allMatches = [...matchesAsUser1, ...matchesAsUser2];

  // Filter to only matches between this user and their partner
  return allMatches.filter(
    (m) =>
      (m.user1Id === userId && m.user2Id === partnerId) ||
      (m.user1Id === partnerId && m.user2Id === userId),
  );
}

export const getMatches = query({
  args: {
    sortBy: v.optional(
      v.union(
        v.literal('newest'),
        v.literal('oldest'),
        v.literal('name_asc'),
        v.literal('name_desc'),
        v.literal('rank'),
      ),
    ),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    if (!user.partnerId) {
      return [];
    }

    const matches = await getPartnershipMatches(ctx, user._id, user.partnerId);

    // Batch load all name documents
    const uniqueNameIds = [...new Set(matches.map((m) => m.nameId))];
    const nameDocsArray = await Promise.all(uniqueNameIds.map((id) => ctx.db.get(id)));
    const nameMap = new Map(uniqueNameIds.map((id, i) => [id, nameDocsArray[i]]));

    const matchesWithDetails = matches.map((match) => ({
      ...match,
      name: nameMap.get(match.nameId) ?? null,
    }));

    let results = matchesWithDetails.filter(
      (m): m is typeof m & { name: NonNullable<typeof m.name> } => m.name !== null,
    );

    // Filter by search term
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      results = results.filter((m) => m.name.name.toLowerCase().includes(searchLower));
    }

    const sortBy = args.sortBy ?? 'newest';
    switch (sortBy) {
      case 'newest':
        results.sort((a, b) => b.matchedAt - a.matchedAt);
        break;
      case 'oldest':
        results.sort((a, b) => a.matchedAt - b.matchedAt);
        break;
      case 'name_asc':
        results.sort((a, b) => a.name.name.localeCompare(b.name.name));
        break;
      case 'name_desc':
        results.sort((a, b) => b.name.name.localeCompare(a.name.name));
        break;
      case 'rank':
        results.sort((a, b) => {
          const rankA = a.rank ?? Infinity;
          const rankB = b.rank ?? Infinity;
          return rankA - rankB;
        });
        break;
    }

    return results;
  },
});

export const getMatchCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return 0;

    if (!user.partnerId) {
      return 0;
    }

    const matches = await getPartnershipMatches(ctx, user._id, user.partnerId);
    return matches.length;
  },
});

export const updateMatch = mutation({
  args: {
    matchId: v.id('matches'),
    isFavorite: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    rank: v.optional(v.number()),
    isChosen: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.notes !== undefined && args.notes.length > 2000) {
      throw new Error('Notes must be 2000 characters or fewer');
    }

    const user = await getCurrentUserOrThrow(ctx);

    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    // Verify user is part of this match
    if (match.user1Id !== user._id && match.user2Id !== user._id) {
      throw new Error('Not authorized to update this match');
    }

    // If marking as chosen, unmark any other chosen name for this partnership
    if (args.isChosen === true && user.partnerId) {
      const partnerMatches = await getPartnershipMatches(ctx, user._id, user.partnerId);
      for (const m of partnerMatches) {
        if (m._id !== args.matchId && m.isChosen) {
          await ctx.db.patch(m._id, {
            isChosen: false,
            updatedAt: Date.now(),
          });
        }
      }
    }

    const updates: {
      isFavorite?: boolean;
      notes?: string;
      rank?: number;
      isChosen?: boolean;
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };

    if (args.isFavorite !== undefined) updates.isFavorite = args.isFavorite;
    if (args.notes !== undefined) updates.notes = args.notes;
    if (args.rank !== undefined) updates.rank = args.rank;
    if (args.isChosen !== undefined) updates.isChosen = args.isChosen;

    await ctx.db.patch(args.matchId, updates);

    return { success: true };
  },
});

export const proposeName = mutation({
  args: {
    matchId: v.id('matches'),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.message !== undefined && args.message.length > 200) {
      throw new Error('Message must be 200 characters or fewer');
    }

    const user = await getCurrentUserOrThrow(ctx);

    if (!user.partnerId) {
      throw new Error('No partner linked');
    }

    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    if (match.user1Id !== user._id && match.user2Id !== user._id) {
      throw new Error('Not authorized to propose on this match');
    }

    if (match.isChosen && match.proposalStatus === 'accepted') {
      throw new Error('This name is already chosen');
    }

    const partnerMatches = await getPartnershipMatches(ctx, user._id, user.partnerId);
    for (const m of partnerMatches) {
      if (m.proposalStatus === 'pending') {
        await ctx.db.patch(m._id, {
          proposedBy: undefined,
          proposedAt: undefined,
          proposalMessage: undefined,
          proposalStatus: undefined,
          updatedAt: Date.now(),
        });
      }
    }

    const now = Date.now();
    await ctx.db.patch(args.matchId, {
      proposedBy: user._id,
      proposedAt: now,
      proposalMessage: args.message,
      proposalStatus: 'pending',
      updatedAt: now,
    });

    return { success: true };
  },
});

export const deleteMatch = mutation({
  args: {
    matchId: v.id('matches'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    if (match.user1Id !== user._id && match.user2Id !== user._id) {
      throw new Error('Not authorized to delete this match');
    }

    await ctx.db.delete(args.matchId);

    return { success: true };
  },
});

export const getChosenName = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;

    if (!user.partnerId) {
      return null;
    }

    const matches = await getPartnershipMatches(ctx, user._id, user.partnerId);
    const chosenMatch = matches.find((m) => m.isChosen);

    if (!chosenMatch) {
      return null;
    }

    const name = await ctx.db.get(chosenMatch.nameId);

    return {
      ...chosenMatch,
      name,
    };
  },
});
