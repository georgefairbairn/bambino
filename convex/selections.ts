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

async function isSessionMemberOrThrow(
  ctx: QueryCtx | MutationCtx,
  sessionId: Id<'sessions'>,
  userId: Id<'users'>
) {
  const membership = await ctx.db
    .query('sessionMembers')
    .withIndex('by_session_and_user', (q) =>
      q.eq('sessionId', sessionId).eq('userId', userId)
    )
    .unique();

  if (!membership) {
    throw new Error('Not a member of this session');
  }

  return membership;
}

async function isSessionMember(
  ctx: QueryCtx | MutationCtx,
  sessionId: Id<'sessions'>,
  userId: Id<'users'>
) {
  const membership = await ctx.db
    .query('sessionMembers')
    .withIndex('by_session_and_user', (q) =>
      q.eq('sessionId', sessionId).eq('userId', userId)
    )
    .unique();

  return membership;
}

export const recordSelection = mutation({
  args: {
    sessionId: v.id('sessions'),
    nameId: v.id('names'),
    selectionType: v.union(
      v.literal('like'),
      v.literal('reject'),
      v.literal('skip')
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    await isSessionMemberOrThrow(ctx, args.sessionId, user._id);

    const existingSelection = await ctx.db
      .query('selections')
      .withIndex('by_session_name', (q) =>
        q.eq('sessionId', args.sessionId).eq('nameId', args.nameId)
      )
      .filter((q) => q.eq(q.field('userId'), user._id))
      .unique();

    const now = Date.now();

    if (existingSelection) {
      await ctx.db.patch(existingSelection._id, {
        selectionType: args.selectionType,
        updatedAt: now,
      });
      return existingSelection._id;
    }

    const selectionId = await ctx.db.insert('selections', {
      sessionId: args.sessionId,
      userId: user._id,
      nameId: args.nameId,
      selectionType: args.selectionType,
      createdAt: now,
      updatedAt: now,
    });

    return selectionId;
  },
});

export const getSwipeQueue = query({
  args: {
    sessionId: v.id('sessions'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Check if session exists and user is a member (graceful handling for deleted sessions)
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return [];
    }

    const membership = await isSessionMember(ctx, args.sessionId, user._id);
    if (!membership) {
      return [];
    }

    const limit = args.limit ?? 50;

    const userSelections = await ctx.db
      .query('selections')
      .withIndex('by_user_session', (q) =>
        q.eq('userId', user._id).eq('sessionId', args.sessionId)
      )
      .collect();

    const swipedNameIds = new Set(userSelections.map((s) => s.nameId));

    let namesQuery;
    if (session.genderFilter === 'both') {
      namesQuery = ctx.db.query('names');
    } else {
      namesQuery = ctx.db
        .query('names')
        .withIndex('by_gender', (q) => q.eq('gender', session.genderFilter));
    }

    const allNames = await namesQuery.collect();

    const filteredNames = allNames.filter((name) => {
      if (swipedNameIds.has(name._id)) {
        return false;
      }

      if (
        session.originFilter !== undefined &&
        session.originFilter.length > 0 &&
        !session.originFilter.includes(name.origin)
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
    sessionId: v.id('sessions'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    await isSessionMemberOrThrow(ctx, args.sessionId, user._id);

    const userSelections = await ctx.db
      .query('selections')
      .withIndex('by_user_session', (q) =>
        q.eq('userId', user._id).eq('sessionId', args.sessionId)
      )
      .collect();

    if (userSelections.length === 0) {
      return null;
    }

    const mostRecent = userSelections.reduce((latest, current) =>
      current.createdAt > latest.createdAt ? current : latest
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
    sessionId: v.id('sessions'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Check if session exists and user is a member (graceful handling for deleted sessions)
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return { liked: 0, rejected: 0, skipped: 0, total: 0 };
    }

    const membership = await isSessionMember(ctx, args.sessionId, user._id);
    if (!membership) {
      return { liked: 0, rejected: 0, skipped: 0, total: 0 };
    }

    const userSelections = await ctx.db
      .query('selections')
      .withIndex('by_user_session', (q) =>
        q.eq('userId', user._id).eq('sessionId', args.sessionId)
      )
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
