import { v } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server';

// All admin utilities are internal functions.
// Run via: npx convex run admin:<functionName> '{"arg": "value"}'

export const getUser = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .unique();

    if (!user) return { error: 'User not found' };

    const partnerName = user.partnerId
      ? (await ctx.db.get(user.partnerId))?.name ?? null
      : null;

    const selectionCounts = {
      likes: (
        await ctx.db
          .query('selections')
          .withIndex('by_user_type', (q) => q.eq('userId', user._id).eq('selectionType', 'like'))
          .collect()
      ).length,
      rejects: (
        await ctx.db
          .query('selections')
          .withIndex('by_user_type', (q) =>
            q.eq('userId', user._id).eq('selectionType', 'reject'),
          )
          .collect()
      ).length,
    };

    return { ...user, partnerName, selectionCounts };
  },
});

export const resetUserToFree = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .unique();

    if (!user) return { error: 'User not found' };

    await ctx.db.patch(user._id, {
      isPremium: undefined,
      purchasedAt: undefined,
      premiumRevokedAt: undefined,
      partnerId: undefined,
      updatedAt: Date.now(),
    });

    return { success: true, userId: user._id };
  },
});

export const grantPremium = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .unique();

    if (!user) return { error: 'User not found' };

    await ctx.db.patch(user._id, {
      isPremium: true,
      purchasedAt: Date.now(),
      premiumRevokedAt: undefined,
      updatedAt: Date.now(),
    });

    return { success: true, userId: user._id };
  },
});

export const simulateGracePeriod = internalMutation({
  args: {
    email: v.string(),
    hoursRemaining: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .unique();

    if (!user) return { error: 'User not found' };

    const hours = args.hoursRemaining ?? 12;
    const gracePeriodMs = 24 * 60 * 60 * 1000;
    const revokedAt = Date.now() - (gracePeriodMs - hours * 60 * 60 * 1000);

    await ctx.db.patch(user._id, {
      isPremium: undefined,
      purchasedAt: undefined,
      premiumRevokedAt: revokedAt,
      partnerId: undefined,
      updatedAt: Date.now(),
    });

    return { success: true, expiresIn: `${hours}h` };
  },
});

export const clearSelections = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .unique();

    if (!user) return { error: 'User not found' };

    const selections = await ctx.db
      .query('selections')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    for (const sel of selections) {
      await ctx.db.delete(sel._id);
    }

    const matches = [
      ...(await ctx.db
        .query('matches')
        .withIndex('by_user1', (q) => q.eq('user1Id', user._id))
        .collect()),
      ...(await ctx.db
        .query('matches')
        .withIndex('by_user2', (q) => q.eq('user2Id', user._id))
        .collect()),
    ];

    for (const match of matches) {
      await ctx.db.delete(match._id);
    }

    return { success: true, deletedSelections: selections.length, deletedMatches: matches.length };
  },
});

export const linkUsers = internalMutation({
  args: { email1: v.string(), email2: v.string() },
  handler: async (ctx, args) => {
    const user1 = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email1))
      .unique();
    const user2 = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email2))
      .unique();

    if (!user1) return { error: `User not found: ${args.email1}` };
    if (!user2) return { error: `User not found: ${args.email2}` };

    const now = Date.now();
    await ctx.db.patch(user1._id, { partnerId: user2._id, updatedAt: now });
    await ctx.db.patch(user2._id, { partnerId: user1._id, updatedAt: now });

    return { success: true };
  },
});

export const unlinkUsers = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .unique();

    if (!user) return { error: 'User not found' };
    if (!user.partnerId) return { error: 'User has no partner' };

    const partner = await ctx.db.get(user.partnerId);
    const now = Date.now();

    await ctx.db.patch(user._id, { partnerId: undefined, updatedAt: now });
    if (partner) {
      await ctx.db.patch(partner._id, { partnerId: undefined, updatedAt: now });
    }

    return { success: true };
  },
});
