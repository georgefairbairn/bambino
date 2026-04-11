import { v } from 'convex/values';
import { mutation, query, QueryCtx, MutationCtx } from './_generated/server';
import { generateUniqueShareCode } from './partners';

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

    const shareCode = await generateUniqueShareCode(ctx);

    const userId = await ctx.db.insert('users', {
      clerkId: identity.subject,
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
      shareCode,
      genderFilter: 'both',
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

    const updates: {
      isPremium: boolean;
      purchasedAt?: number;
      premiumRevokedAt?: number;
      updatedAt: number;
    } = {
      isPremium: args.isPremium,
      updatedAt: Date.now(),
    };

    if (args.isPremium) {
      updates.purchasedAt = Date.now();
      // Clear own grace period since user now has their own premium
      if (user.premiumRevokedAt) {
        updates.premiumRevokedAt = undefined;
      }
    } else {
      updates.purchasedAt = undefined;
      // If losing premium and has a non-premium partner, set grace period on partner
      if (user.partnerId) {
        const partner = await ctx.db.get(user.partnerId);
        if (partner && partner.isPremium !== true) {
          await ctx.db.patch(partner._id, {
            premiumRevokedAt: Date.now(),
          });
        }
      }
    }

    await ctx.db.patch(user._id, updates);

    return { success: true };
  },
});

export const confirmName = mutation({
  args: {
    firstName: v.string(),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const fullName = args.lastName
      ? `${args.firstName.trim()} ${args.lastName.trim()}`
      : args.firstName.trim();

    await ctx.db.patch(user._id, {
      name: fullName,
      nameConfirmed: true,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const updateFilters = mutation({
  args: {
    genderFilter: v.optional(v.union(v.literal('boy'), v.literal('girl'), v.literal('both'))),
    originFilter: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const updates: {
      genderFilter?: 'boy' | 'girl' | 'both';
      originFilter?: string[];
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };

    if (args.genderFilter !== undefined) updates.genderFilter = args.genderFilter;
    if (args.originFilter !== undefined) updates.originFilter = args.originFilter;

    await ctx.db.patch(user._id, updates);

    return { success: true };
  },
});

export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Unlink partner
    if (user.partnerId) {
      const partner = await ctx.db.get(user.partnerId);
      if (partner) {
        await ctx.db.patch(partner._id, {
          partnerId: undefined,
          updatedAt: Date.now(),
        });
      }
    }

    // Delete all selections by this user
    const selections = await ctx.db
      .query('selections')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    for (const selection of selections) {
      await ctx.db.delete(selection._id);
    }

    // Delete all matches involving this user
    const matchesAsUser1 = await ctx.db
      .query('matches')
      .withIndex('by_user1', (q) => q.eq('user1Id', user._id))
      .collect();

    for (const match of matchesAsUser1) {
      await ctx.db.delete(match._id);
    }

    const matchesAsUser2 = await ctx.db
      .query('matches')
      .withIndex('by_user2', (q) => q.eq('user2Id', user._id))
      .collect();

    for (const match of matchesAsUser2) {
      await ctx.db.delete(match._id);
    }

    // Delete the user record itself
    await ctx.db.delete(user._id);

    return { success: true };
  },
});
