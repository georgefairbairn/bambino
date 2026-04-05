import { v } from 'convex/values';
import { mutation, query, QueryCtx, MutationCtx } from './_generated/server';

function generateShareCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function generateUniqueShareCode(ctx: QueryCtx | MutationCtx): Promise<string> {
  let code = generateShareCode();
  let existing = await ctx.db
    .query('users')
    .withIndex('by_share_code', (q) => q.eq('shareCode', code))
    .unique();

  while (existing) {
    code = generateShareCode();
    existing = await ctx.db
      .query('users')
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

export const getPartnerInfo = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();

    if (!user) return null;

    let partner = null;
    if (user.partnerId) {
      const partnerDoc = await ctx.db.get(user.partnerId);
      if (partnerDoc) {
        partner = {
          _id: partnerDoc._id,
          name: partnerDoc.name,
          imageUrl: partnerDoc.imageUrl,
        };
      }
    }

    return {
      shareCode: user.shareCode ?? null,
      partner,
    };
  },
});

export const getUserByShareCode = query({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedCode = args.code.toUpperCase().replace(/\s/g, '');
    if (!/^[A-Z0-9]{6}$/.test(normalizedCode)) {
      return { error: 'invalid_format' as const };
    }

    const targetUser = await ctx.db
      .query('users')
      .withIndex('by_share_code', (q) => q.eq('shareCode', normalizedCode))
      .unique();

    if (!targetUser) {
      return { error: 'not_found' as const };
    }

    const identity = await ctx.auth.getUserIdentity();
    if (identity) {
      const currentUser = await ctx.db
        .query('users')
        .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
        .unique();

      if (currentUser) {
        if (targetUser._id === currentUser._id) {
          return { error: 'own_code' as const };
        }
        if (currentUser.partnerId) {
          return { error: 'already_has_partner' as const };
        }
        if (targetUser.partnerId) {
          return { error: 'target_has_partner' as const };
        }
      }
    }

    return {
      userId: targetUser._id,
      name: targetUser.name ?? 'Bambino User',
      imageUrl: targetUser.imageUrl,
    };
  },
});

export const linkPartner = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const normalizedCode = args.code.toUpperCase().replace(/\s/g, '');
    if (!/^[A-Z0-9]{6}$/.test(normalizedCode)) {
      throw new Error('Please enter a valid 6-character code');
    }

    const targetUser = await ctx.db
      .query('users')
      .withIndex('by_share_code', (q) => q.eq('shareCode', normalizedCode))
      .unique();

    if (!targetUser) {
      throw new Error('User not found. Please check the code.');
    }

    if (targetUser._id === user._id) {
      throw new Error("You can't link with yourself");
    }

    if (user.partnerId) {
      throw new Error('You already have a partner linked');
    }

    if (targetUser.partnerId) {
      throw new Error('This user already has a partner linked');
    }

    // At least one user must be premium
    const userIsPremium = user.isPremium === true;
    const targetIsPremium = targetUser.isPremium === true;

    if (!userIsPremium && !targetIsPremium) {
      return { error: 'FREE_TIER_PARTNER_LIMIT' as const };
    }

    const now = Date.now();

    // Link bidirectionally
    await ctx.db.patch(user._id, {
      partnerId: targetUser._id,
      updatedAt: now,
    });

    await ctx.db.patch(targetUser._id, {
      partnerId: user._id,
      updatedAt: now,
    });

    return { success: true };
  },
});

export const unlinkPartner = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);

    if (!user.partnerId) {
      throw new Error('No partner linked');
    }

    const partner = await ctx.db.get(user.partnerId);
    const now = Date.now();

    await ctx.db.patch(user._id, {
      partnerId: undefined,
      updatedAt: now,
    });

    if (partner) {
      await ctx.db.patch(partner._id, {
        partnerId: undefined,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});
