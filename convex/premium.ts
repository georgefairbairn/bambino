import { query, QueryCtx, MutationCtx } from './_generated/server';
import { Id } from './_generated/dataModel';

const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000; // 24 hours

export type EffectivePremiumStatus = {
  isPremium: boolean;
  isOwnPremium: boolean;
  isPartnerPremium: boolean;
  partnerName?: string;
  gracePeriodEndsAt?: number;
};

export async function getEffectivePremiumStatusHelper(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>,
): Promise<EffectivePremiumStatus> {
  const user = await ctx.db.get(userId);
  if (!user) {
    return { isPremium: false, isOwnPremium: false, isPartnerPremium: false };
  }

  // 1. Own premium
  if (user.isPremium === true) {
    return { isPremium: true, isOwnPremium: true, isPartnerPremium: false };
  }

  // 2. Partner premium
  if (user.partnerId) {
    const partner = await ctx.db.get(user.partnerId);
    if (partner?.isPremium === true) {
      return {
        isPremium: true,
        isOwnPremium: false,
        isPartnerPremium: true,
        partnerName: partner.name,
      };
    }
  }

  // 3. Grace period
  if (user.premiumRevokedAt) {
    const gracePeriodEndsAt = user.premiumRevokedAt + GRACE_PERIOD_MS;
    if (Date.now() < gracePeriodEndsAt) {
      return {
        isPremium: true,
        isOwnPremium: false,
        isPartnerPremium: false,
        gracePeriodEndsAt,
      };
    }
  }

  // 4. Not premium
  return { isPremium: false, isOwnPremium: false, isPartnerPremium: false };
}

export const getEffectivePremiumStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { isPremium: false, isOwnPremium: false, isPartnerPremium: false };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();

    if (!user) {
      return { isPremium: false, isOwnPremium: false, isPartnerPremium: false };
    }

    return getEffectivePremiumStatusHelper(ctx, user._id);
  },
});
