import { v } from 'convex/values';
import { mutation, query, QueryCtx, MutationCtx } from './_generated/server';
import { Id } from './_generated/dataModel';

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

async function isSessionMember(
  ctx: QueryCtx | MutationCtx,
  sessionId: Id<'sessions'>,
  userId: Id<'users'>,
) {
  const membership = await ctx.db
    .query('sessionMembers')
    .withIndex('by_session_and_user', (q) => q.eq('sessionId', sessionId).eq('userId', userId))
    .unique();

  return membership;
}

// Get all matches for a session
export const getMatches = query({
  args: {
    sessionId: v.id('sessions'),
    sortBy: v.optional(
      v.union(
        v.literal('newest'),
        v.literal('oldest'),
        v.literal('name_asc'),
        v.literal('name_desc'),
        v.literal('rank'),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Check if session exists and user is a member
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return [];
    }

    const membership = await isSessionMember(ctx, args.sessionId, user._id);
    if (!membership) {
      return [];
    }

    // Get all matches for this session
    const matches = await ctx.db
      .query('matches')
      .withIndex('by_session_id', (q) => q.eq('sessionId', args.sessionId))
      .collect();

    // Join with name details
    const matchesWithDetails = await Promise.all(
      matches.map(async (match) => {
        const name = await ctx.db.get(match.nameId);
        return {
          ...match,
          name,
        };
      }),
    );

    // Filter out any with null names
    let results = matchesWithDetails.filter(
      (m): m is typeof m & { name: NonNullable<typeof m.name> } => m.name !== null,
    );

    // Apply sorting
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

// Get match count for a session
export const getMatchCount = query({
  args: {
    sessionId: v.id('sessions'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Check if session exists and user is a member
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return 0;
    }

    const membership = await isSessionMember(ctx, args.sessionId, user._id);
    if (!membership) {
      return 0;
    }

    const matches = await ctx.db
      .query('matches')
      .withIndex('by_session_id', (q) => q.eq('sessionId', args.sessionId))
      .collect();

    return matches.length;
  },
});

// Update a match (favorite, notes, rank, chosen)
export const updateMatch = mutation({
  args: {
    matchId: v.id('matches'),
    isFavorite: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    rank: v.optional(v.number()),
    isChosen: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Get the match
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    // Verify user is a member of the session
    const membership = await isSessionMember(ctx, match.sessionId, user._id);
    if (!membership) {
      throw new Error('Not authorized to update this match');
    }

    // If marking as chosen, unmark any other chosen name in the session
    if (args.isChosen === true) {
      const existingChosen = await ctx.db
        .query('matches')
        .withIndex('by_session_chosen', (q) =>
          q.eq('sessionId', match.sessionId).eq('isChosen', true),
        )
        .collect();

      for (const chosen of existingChosen) {
        if (chosen._id !== args.matchId) {
          await ctx.db.patch(chosen._id, {
            isChosen: false,
            updatedAt: Date.now(),
          });
        }
      }
    }

    // Build update object
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

// Delete a match
export const deleteMatch = mutation({
  args: {
    matchId: v.id('matches'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Get the match
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    // Verify user is a member of the session
    const membership = await isSessionMember(ctx, match.sessionId, user._id);
    if (!membership) {
      throw new Error('Not authorized to delete this match');
    }

    await ctx.db.delete(args.matchId);

    return { success: true };
  },
});

// Get the chosen name for a session
export const getChosenName = query({
  args: {
    sessionId: v.id('sessions'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Check if session exists and user is a member
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return null;
    }

    const membership = await isSessionMember(ctx, args.sessionId, user._id);
    if (!membership) {
      return null;
    }

    const chosenMatch = await ctx.db
      .query('matches')
      .withIndex('by_session_chosen', (q) => q.eq('sessionId', args.sessionId).eq('isChosen', true))
      .first();

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
