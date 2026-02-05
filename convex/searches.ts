import { v } from 'convex/values';
import { mutation, query, internalMutation, QueryCtx, MutationCtx } from './_generated/server';
import { Id } from './_generated/dataModel';

function generateShareCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function generateUniqueShareCode(ctx: QueryCtx | MutationCtx): Promise<string> {
  let code = generateShareCode();
  let existing = await ctx.db
    .query('searches')
    .withIndex('by_share_code', (q) => q.eq('shareCode', code))
    .unique();

  while (existing) {
    code = generateShareCode();
    existing = await ctx.db
      .query('searches')
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

export const createSearch = mutation({
  args: {
    name: v.string(),
    genderFilter: v.union(v.literal('boy'), v.literal('girl'), v.literal('both')),
    originFilter: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const now = Date.now();
    const shareCode = await generateUniqueShareCode(ctx);

    const searchId = await ctx.db.insert('searches', {
      name: args.name,
      genderFilter: args.genderFilter,
      originFilter: args.originFilter,
      shareCode,
      status: 'active',
      ownerId: user._id,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('searchMembers', {
      searchId,
      userId: user._id,
      role: 'owner',
      createdAt: now,
      updatedAt: now,
    });

    return searchId;
  },
});

export const updateSearch = mutation({
  args: {
    searchId: v.id('searches'),
    name: v.optional(v.string()),
    genderFilter: v.optional(v.union(v.literal('boy'), v.literal('girl'), v.literal('both'))),
    status: v.optional(v.union(v.literal('active'), v.literal('archived'))),
    originFilter: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const search = await ctx.db.get(args.searchId);
    if (!search) {
      throw new Error('Search not found');
    }

    const membership = await isSearchMember(ctx, args.searchId, user._id);
    if (!membership) {
      throw new Error('Not a member of this search');
    }

    const { searchId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined),
    );

    await ctx.db.patch(args.searchId, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    });

    return args.searchId;
  },
});

export const deleteSearch = mutation({
  args: {
    searchId: v.id('searches'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const search = await ctx.db.get(args.searchId);
    if (!search) {
      throw new Error('Search not found');
    }

    if (search.ownerId !== user._id) {
      throw new Error('Only the owner can delete a search');
    }

    const members = await ctx.db
      .query('searchMembers')
      .withIndex('by_search_id', (q) => q.eq('searchId', args.searchId))
      .collect();

    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    await ctx.db.delete(args.searchId);

    return args.searchId;
  },
});

export const getUserSearches = query({
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
      .query('searchMembers')
      .withIndex('by_user_id', (q) => q.eq('userId', user._id))
      .collect();

    const searchesWithRole = await Promise.all(
      memberships.map(async (membership) => {
        const search = await ctx.db.get(membership.searchId);
        if (!search) return null;

        // Get all members to find partner info
        const allMembers = await ctx.db
          .query('searchMembers')
          .withIndex('by_search_id', (q) => q.eq('searchId', membership.searchId))
          .collect();

        // Find the other member (partner) if exists
        const otherMember = allMembers.find((m) => m.userId !== user._id);
        let partnerName: string | undefined;

        if (otherMember) {
          const partnerUser = await ctx.db.get(otherMember.userId);
          partnerName = partnerUser?.name ?? partnerUser?.email;
        }

        return {
          ...search,
          role: membership.role,
          partnerName,
        };
      }),
    );

    return searchesWithRole.filter((search) => search !== null);
  },
});

export const getSearchById = query({
  args: {
    searchId: v.id('searches'),
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

    const search = await ctx.db.get(args.searchId);
    if (!search) {
      throw new Error('Search not found');
    }

    const membership = await isSearchMember(ctx, args.searchId, user._id);
    if (!membership) {
      throw new Error('Not a member of this search');
    }

    const allMembers = await ctx.db
      .query('searchMembers')
      .withIndex('by_search_id', (q) => q.eq('searchId', args.searchId))
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
      }),
    );

    return {
      ...search,
      members: membersWithDetails,
    };
  },
});

export const createDefaultSearch = internalMutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const shareCode = await generateUniqueShareCode(ctx);

    const searchId = await ctx.db.insert('searches', {
      name: 'My Baby Names',
      genderFilter: 'both',
      shareCode,
      status: 'active',
      ownerId: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('searchMembers', {
      searchId,
      userId: args.userId,
      role: 'owner',
      createdAt: now,
      updatedAt: now,
    });

    return searchId;
  },
});

export const getSearchByShareCode = query({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate code format (6 chars, alphanumeric)
    const normalizedCode = args.code.toUpperCase().replace(/\s/g, '');
    if (!/^[A-Z0-9]{6}$/.test(normalizedCode)) {
      return { error: 'invalid_format' as const };
    }

    const search = await ctx.db
      .query('searches')
      .withIndex('by_share_code', (q) => q.eq('shareCode', normalizedCode))
      .unique();

    if (!search) {
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
        if (search.ownerId === user._id) {
          return { error: 'own_search' as const };
        }

        const membership = await isSearchMember(ctx, search._id, user._id);
        if (membership) {
          return { error: 'already_member' as const };
        }
      }
    }

    // Get owner info
    const owner = await ctx.db.get(search.ownerId);

    return {
      searchId: search._id,
      name: search.name,
      ownerName: owner?.name ?? 'Unknown',
      genderFilter: search.genderFilter,
    };
  },
});

export const archiveSearch = mutation({
  args: {
    searchId: v.id('searches'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const search = await ctx.db.get(args.searchId);
    if (!search) {
      throw new Error('Search not found');
    }

    const membership = await isSearchMember(ctx, args.searchId, user._id);
    if (!membership) {
      throw new Error('Not a member of this search');
    }

    await ctx.db.patch(args.searchId, {
      status: 'archived',
      updatedAt: Date.now(),
    });

    return args.searchId;
  },
});

export const unarchiveSearch = mutation({
  args: {
    searchId: v.id('searches'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const search = await ctx.db.get(args.searchId);
    if (!search) {
      throw new Error('Search not found');
    }

    const membership = await isSearchMember(ctx, args.searchId, user._id);
    if (!membership) {
      throw new Error('Not a member of this search');
    }

    await ctx.db.patch(args.searchId, {
      status: 'active',
      updatedAt: Date.now(),
    });

    return args.searchId;
  },
});

export const joinSearchByCode = mutation({
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

    const search = await ctx.db
      .query('searches')
      .withIndex('by_share_code', (q) => q.eq('shareCode', normalizedCode))
      .unique();

    if (!search) {
      throw new Error('Search not found. Please check the code.');
    }

    // Check if user owns the search
    if (search.ownerId === user._id) {
      throw new Error('This is your own search');
    }

    // Check if already a member
    const existingMembership = await isSearchMember(ctx, search._id, user._id);
    if (existingMembership) {
      throw new Error("You're already a member of this search");
    }

    // Add user as partner
    const now = Date.now();
    await ctx.db.insert('searchMembers', {
      searchId: search._id,
      userId: user._id,
      role: 'partner',
      createdAt: now,
      updatedAt: now,
    });

    return search._id;
  },
});
