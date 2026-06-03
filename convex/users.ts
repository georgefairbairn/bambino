import { v } from 'convex/values';
import { mutation, query, QueryCtx, MutationCtx } from './_generated/server';
import { generateUniqueShareCode } from './partners';

async function getCurrentUserOrThrow(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error('Not authenticated');
  }

  // #164: .first() instead of .unique() so a stray duplicate clerkId row
  // (legacy data, before createOrUpdateUser's heal ran) can't throw and break
  // every authed screen. by_clerk_id returns oldest-first, matching the row
  // createOrUpdateUser keeps when it dedupes.
  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .first();

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

    // #164: tolerant read — see getCurrentUserOrThrow.
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

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

    // #164: collect (not .unique()) so we can self-heal duplicate clerkId rows
    // created before this guard existed (e.g. concurrent first-sign-in from two
    // devices on the same Apple ID). Convex's OCC already prevents NEW races —
    // the existence read and the insert below touch the same by_clerk_id range,
    // so a concurrent second insert conflicts and retries — but a pre-existing
    // duplicate would make .unique() throw here and everywhere else. Keep the
    // oldest row, delete the rest.
    const existingRows = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .collect();
    existingRows.sort((a, b) => a._creationTime - b._creationTime);
    const existingUser = existingRows[0] ?? null;
    for (let i = 1; i < existingRows.length; i++) {
      await ctx.db.delete(existingRows[i]._id);
    }

    const now = Date.now();

    if (existingUser) {
      // Only overwrite name/imageUrl when Clerk actually provides a value.
      // Otherwise we'd erase fields set elsewhere (admin seed, name-edit
      // modal) every time useStoreUser fires on app launch.
      // Once a user has confirmed their name in-app (NameConfirmationModal
      // sets nameConfirmed=true), don't let Clerk's fullName overwrite it
      // on subsequent sign-ins (#166).
      const patch: Record<string, unknown> = { email: args.email, updatedAt: now };
      if (args.name && existingUser.nameConfirmed !== true) patch.name = args.name;
      if (args.imageUrl) patch.imageUrl = args.imageUrl;
      await ctx.db.patch(existingUser._id, patch);
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

    // #164 belt-and-suspenders: if a concurrent insert somehow also won (OCC
    // should make this impossible since both touch by_clerk_id, but indexes
    // are not unique constraints), re-read and keep only the oldest row.
    const afterInsert = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .collect();
    if (afterInsert.length > 1) {
      afterInsert.sort((a, b) => a._creationTime - b._creationTime);
      for (let i = 1; i < afterInsert.length; i++) {
        await ctx.db.delete(afterInsert[i]._id);
      }
      return afterInsert[0]._id;
    }

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

// Expo push tokens are always of the form "ExponentPushToken[<base64-ish>]".
// Anything else is either a different gateway's token (FCM, APNs raw) or
// garbage from a malicious caller. Reject up front (#172).
const EXPO_PUSH_TOKEN_REGEX = /^ExponentPushToken\[[A-Za-z0-9_-]+\]$/;

export const setPushToken = mutation({
  args: {
    token: v.string(),
    platform: v.union(v.literal('ios'), v.literal('android')),
  },
  handler: async (ctx, args) => {
    if (!EXPO_PUSH_TOKEN_REGEX.test(args.token)) {
      throw new Error('Invalid push token format');
    }
    const user = await getCurrentUserOrThrow(ctx);
    await ctx.db.patch(user._id, {
      pushToken: args.token,
      pushTokenPlatform: args.platform,
      updatedAt: Date.now(),
    });
  },
});

/** Mark or unmark this user's onboarding as completed. Stored on the user
 *  row rather than AsyncStorage so it survives sign-out/sign-in on the
 *  same device and doesn't leak across accounts on shared devices (#154). */
export const setOnboardingCompleted = mutation({
  args: { completed: v.boolean() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    await ctx.db.patch(user._id, {
      onboardingCompleted: args.completed,
      updatedAt: Date.now(),
    });
  },
});

/** Drop the device's push token from this user's row. Called on sign-out
 *  to prevent cross-user notifications on shared devices (#172). */
export const clearPushToken = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    await ctx.db.patch(user._id, {
      pushToken: undefined,
      pushTokenPlatform: undefined,
      updatedAt: Date.now(),
    });
  },
});
