import { v } from 'convex/values';
import {
  mutation,
  query,
  internalMutation,
  QueryCtx,
  MutationCtx,
} from './_generated/server';
import { Id } from './_generated/dataModel';

function generateShareCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function generateUniqueShareCode(
  ctx: QueryCtx | MutationCtx
): Promise<string> {
  let code = generateShareCode();
  let existing = await ctx.db
    .query('sessions')
    .withIndex('by_share_code', (q) => q.eq('shareCode', code))
    .unique();

  while (existing) {
    code = generateShareCode();
    existing = await ctx.db
      .query('sessions')
      .withIndex('by_share_code', (q) => q.eq('shareCode', code))
      .unique();
  }

  return code;
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

export const createSession = mutation({
  args: {
    name: v.string(),
    genderFilter: v.union(
      v.literal('boy'),
      v.literal('girl'),
      v.literal('both')
    ),
    originFilter: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const now = Date.now();
    const shareCode = await generateUniqueShareCode(ctx);

    const sessionId = await ctx.db.insert('sessions', {
      name: args.name,
      genderFilter: args.genderFilter,
      originFilter: args.originFilter,
      shareCode,
      status: 'active',
      ownerId: user._id,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('sessionMembers', {
      sessionId,
      userId: user._id,
      role: 'owner',
      createdAt: now,
      updatedAt: now,
    });

    return sessionId;
  },
});

export const updateSession = mutation({
  args: {
    sessionId: v.id('sessions'),
    name: v.optional(v.string()),
    genderFilter: v.optional(
      v.union(v.literal('boy'), v.literal('girl'), v.literal('both'))
    ),
    status: v.optional(v.union(v.literal('active'), v.literal('archived'))),
    originFilter: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const membership = await isSessionMember(ctx, args.sessionId, user._id);
    if (!membership) {
      throw new Error('Not a member of this session');
    }

    const { sessionId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    await ctx.db.patch(args.sessionId, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    return args.sessionId;
  },
});

export const deleteSession = mutation({
  args: {
    sessionId: v.id('sessions'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.ownerId !== user._id) {
      throw new Error('Only the owner can delete a session');
    }

    const members = await ctx.db
      .query('sessionMembers')
      .withIndex('by_session_id', (q) => q.eq('sessionId', args.sessionId))
      .collect();

    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    await ctx.db.delete(args.sessionId);

    return args.sessionId;
  },
});

export const getUserSessions = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    const memberships = await ctx.db
      .query('sessionMembers')
      .withIndex('by_user_id', (q) => q.eq('userId', user._id))
      .collect();

    const sessionsWithRole = await Promise.all(
      memberships.map(async (membership) => {
        const session = await ctx.db.get(membership.sessionId);
        if (!session) return null;
        return {
          ...session,
          role: membership.role,
        };
      })
    );

    return sessionsWithRole.filter((session) => session !== null);
  },
});

export const getSessionById = query({
  args: {
    sessionId: v.id('sessions'),
  },
  handler: async (ctx, args) => {
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

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const membership = await isSessionMember(ctx, args.sessionId, user._id);
    if (!membership) {
      throw new Error('Not a member of this session');
    }

    const allMembers = await ctx.db
      .query('sessionMembers')
      .withIndex('by_session_id', (q) => q.eq('sessionId', args.sessionId))
      .collect();

    const membersWithDetails = await Promise.all(
      allMembers.map(async (member) => {
        const memberUser = await ctx.db.get(member.userId);
        return {
          userId: member.userId,
          role: member.role,
          name: memberUser?.name,
          email: memberUser?.email,
          imageUrl: memberUser?.imageUrl,
        };
      })
    );

    return {
      ...session,
      members: membersWithDetails,
    };
  },
});

export const createDefaultSession = internalMutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const shareCode = await generateUniqueShareCode(ctx);

    const sessionId = await ctx.db.insert('sessions', {
      name: 'My Baby Names',
      genderFilter: 'both',
      shareCode,
      status: 'active',
      ownerId: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('sessionMembers', {
      sessionId,
      userId: args.userId,
      role: 'owner',
      createdAt: now,
      updatedAt: now,
    });

    return sessionId;
  },
});

export const getSessionByShareCode = query({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate code format (6 chars, alphanumeric)
    const normalizedCode = args.code.toUpperCase().replace(/\s/g, '');
    if (!/^[A-Z0-9]{6}$/.test(normalizedCode)) {
      return { error: 'invalid_format' as const };
    }

    const session = await ctx.db
      .query('sessions')
      .withIndex('by_share_code', (q) => q.eq('shareCode', normalizedCode))
      .unique();

    if (!session) {
      return { error: 'not_found' as const };
    }

    // Check if current user is the owner or already a member
    const identity = await ctx.auth.getUserIdentity();
    if (identity) {
      const user = await ctx.db
        .query('users')
        .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
        .unique();

      if (user) {
        if (session.ownerId === user._id) {
          return { error: 'own_session' as const };
        }

        const membership = await isSessionMember(ctx, session._id, user._id);
        if (membership) {
          return { error: 'already_member' as const };
        }
      }
    }

    // Get owner info
    const owner = await ctx.db.get(session.ownerId);

    return {
      sessionId: session._id,
      name: session.name,
      ownerName: owner?.name ?? 'Unknown',
      genderFilter: session.genderFilter,
    };
  },
});

export const joinSessionByCode = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Validate code format
    const normalizedCode = args.code.toUpperCase().replace(/\s/g, '');
    if (!/^[A-Z0-9]{6}$/.test(normalizedCode)) {
      throw new Error('Please enter a valid 6-character code');
    }

    const session = await ctx.db
      .query('sessions')
      .withIndex('by_share_code', (q) => q.eq('shareCode', normalizedCode))
      .unique();

    if (!session) {
      throw new Error('Session not found. Please check the code.');
    }

    // Check if user owns the session
    if (session.ownerId === user._id) {
      throw new Error('This is your own session');
    }

    // Check if already a member
    const existingMembership = await isSessionMember(ctx, session._id, user._id);
    if (existingMembership) {
      throw new Error("You're already a member of this session");
    }

    // Add user as partner
    const now = Date.now();
    await ctx.db.insert('sessionMembers', {
      sessionId: session._id,
      userId: user._id,
      role: 'partner',
      createdAt: now,
      updatedAt: now,
    });

    return session._id;
  },
});
