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

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();

    return user;
  },
});

export const createOrUpdateUser = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();

    const now = Date.now();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        name: args.name,
        imageUrl: args.imageUrl,
        updatedAt: now,
      });
      return existingUser._id;
    }

    const userId = await ctx.db.insert('users', {
      clerkId: identity.subject,
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
      createdAt: now,
      updatedAt: now,
    });

    return userId;
  },
});

export const updatePremiumStatus = mutation({
  args: {
    isPremium: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    await ctx.db.patch(user._id, {
      isPremium: args.isPremium,
      purchasedAt: args.isPremium ? Date.now() : undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Delete all selections by this user
    const selections = await ctx.db
      .query('selections')
      .withIndex('by_user_search', (q) => q.eq('userId', user._id))
      .collect();

    for (const selection of selections) {
      await ctx.db.delete(selection._id);
    }

    // Delete all matches involving this user
    const allMatches = await ctx.db.query('matches').collect();
    const userMatches = allMatches.filter(
      (m) => m.user1Id === user._id || m.user2Id === user._id,
    );

    for (const match of userMatches) {
      await ctx.db.delete(match._id);
    }

    // Delete all search memberships
    const memberships = await ctx.db
      .query('searchMembers')
      .withIndex('by_user_id', (q) => q.eq('userId', user._id))
      .collect();

    for (const membership of memberships) {
      await ctx.db.delete(membership._id);
    }

    // Delete searches owned by this user
    const ownedSearches = await ctx.db
      .query('searches')
      .withIndex('by_owner_id', (q) => q.eq('ownerId', user._id))
      .collect();

    for (const search of ownedSearches) {
      // Clean up remaining members, selections, and matches for owned searches
      const searchMembers = await ctx.db
        .query('searchMembers')
        .withIndex('by_search_id', (q) => q.eq('searchId', search._id))
        .collect();
      for (const member of searchMembers) {
        await ctx.db.delete(member._id);
      }

      const searchSelections = await ctx.db
        .query('selections')
        .withIndex('by_search_id', (q) => q.eq('searchId', search._id))
        .collect();
      for (const sel of searchSelections) {
        await ctx.db.delete(sel._id);
      }

      const searchMatches = await ctx.db
        .query('matches')
        .withIndex('by_search_id', (q) => q.eq('searchId', search._id))
        .collect();
      for (const m of searchMatches) {
        await ctx.db.delete(m._id);
      }

      await ctx.db.delete(search._id);
    }

    // Delete the user record itself
    await ctx.db.delete(user._id);

    return { success: true };
  },
});
