import { v } from 'convex/values';
import { mutation, query, QueryCtx, MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { sanitizeImageUrl } from './validation';

// 31-char alphabet with confusables (I/O/0/1) removed for readability when
// users dictate codes verbally. 31^8 ≈ 8.5e11 keyspace.
const SHARE_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const SHARE_CODE_LENGTH = 8;
const SHARE_CODE_REGEX = new RegExp(`^[${SHARE_CODE_ALPHABET}]{${SHARE_CODE_LENGTH}}$`);

function generateShareCode(): string {
  const bytes = new Uint8Array(SHARE_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = '';
  for (let i = 0; i < SHARE_CODE_LENGTH; i++) {
    code += SHARE_CODE_ALPHABET.charAt(bytes[i] % SHARE_CODE_ALPHABET.length);
  }
  return code;
}

export async function generateUniqueShareCode(ctx: QueryCtx | MutationCtx): Promise<string> {
  // Loop is bounded in practice — collision probability with 8.5e11 keyspace
  // is vanishingly small even at millions of users. We cap iterations as a
  // safety net rather than letting it spin.
  for (let i = 0; i < 8; i++) {
    const code = generateShareCode();
    const existing = await ctx.db
      .query('users')
      .withIndex('by_share_code', (q) => q.eq('shareCode', code))
      .unique();
    if (!existing) return code;
  }
  throw new Error('Could not generate a unique share code');
}

async function getCurrentUserOrThrow(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error('Not authenticated');
  }

  // #164: tolerant read — a stray duplicate clerkId row shouldn't throw and
  // break partner linking. createOrUpdateUser self-heals duplicates.
  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .first();

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}

// ---- Rate limiting ---------------------------------------------------------

const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_ATTEMPTS = 10;
// Backoff schedule, indexed by lockoutCount. Last entry repeats.
const LOCKOUT_DURATIONS_MS = [
  1 * 60 * 1000, // 1 min
  5 * 60 * 1000, // 5 min
  30 * 60 * 1000, // 30 min
  60 * 60 * 1000, // 60 min
];

class RateLimitError extends Error {
  constructor(public retryAfterMs: number) {
    const seconds = Math.ceil(retryAfterMs / 1000);
    const minutes = Math.ceil(seconds / 60);
    super(
      seconds < 60
        ? `Too many attempts. Try again in ${seconds} seconds.`
        : `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
    );
    this.name = 'RateLimitError';
  }
}

async function enforceRateLimit(ctx: MutationCtx, userId: Id<'users'>): Promise<void> {
  const now = Date.now();
  const record = await ctx.db
    .query('shareCodeAttempts')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .unique();

  if (record?.lockedUntil && now < record.lockedUntil) {
    throw new RateLimitError(record.lockedUntil - now);
  }

  if (!record) {
    await ctx.db.insert('shareCodeAttempts', {
      userId,
      attempts: 1,
      windowStart: now,
      lockoutCount: 0,
    });
    return;
  }

  // Slide the window forward if it's expired.
  if (now - record.windowStart >= RATE_WINDOW_MS) {
    await ctx.db.patch(record._id, {
      attempts: 1,
      windowStart: now,
      lockedUntil: undefined,
    });
    return;
  }

  const newAttempts = record.attempts + 1;

  if (newAttempts > RATE_MAX_ATTEMPTS) {
    const nextLockoutCount = record.lockoutCount + 1;
    const lockoutMs =
      LOCKOUT_DURATIONS_MS[Math.min(nextLockoutCount - 1, LOCKOUT_DURATIONS_MS.length - 1)];
    await ctx.db.patch(record._id, {
      attempts: newAttempts,
      lockoutCount: nextLockoutCount,
      lockedUntil: now + lockoutMs,
    });
    throw new RateLimitError(lockoutMs);
  }

  await ctx.db.patch(record._id, { attempts: newAttempts });
}

async function resetRateLimit(ctx: MutationCtx, userId: Id<'users'>): Promise<void> {
  const record = await ctx.db
    .query('shareCodeAttempts')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .unique();
  if (record) {
    await ctx.db.delete(record._id);
  }
}

// ---- Code validation -------------------------------------------------------

function normalizeAndValidateCode(input: string): string | null {
  const normalized = input.toUpperCase().replace(/\s/g, '');
  return SHARE_CODE_REGEX.test(normalized) ? normalized : null;
}

// ---- Public queries / mutations -------------------------------------------

export const getPartnerInfo = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // #164: tolerant read — see the linking helper above.
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!user) return null;

    let partner = null;
    if (user.partnerId) {
      const partnerDoc = await ctx.db.get(user.partnerId);
      if (partnerDoc) {
        partner = {
          _id: partnerDoc._id,
          name: partnerDoc.name,
          // #202: strip on read too, so a legacy non-Clerk URL stored before
          // write-validation existed can't leak the partner's IP/UA via <Image>.
          imageUrl: sanitizeImageUrl(partnerDoc.imageUrl),
        };
      }
    }

    return {
      shareCode: user.shareCode ?? null,
      partner,
    };
  },
});

/**
 * Auth-gated, rate-limited preview lookup. Replaces the old public
 * `getUserByShareCode` query — anonymous probing is no longer possible
 * (#150). A mutation rather than a query so the rate-limit counter
 * increments transactionally.
 *
 * Returns the partner's display name only; image is fetched after a
 * successful link via getPartnerInfo. Errors are returned as discriminated
 * objects rather than thrown so the UI can render specific messages.
 */
export const previewPartnerByCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    await enforceRateLimit(ctx, user._id);

    const normalizedCode = normalizeAndValidateCode(args.code);
    if (!normalizedCode) {
      return { error: 'invalid_format' as const };
    }

    const targetUser = await ctx.db
      .query('users')
      .withIndex('by_share_code', (q) => q.eq('shareCode', normalizedCode))
      .unique();

    if (!targetUser) {
      return { error: 'not_found' as const };
    }

    if (targetUser._id === user._id) {
      return { error: 'own_code' as const };
    }
    if (user.partnerId) {
      return { error: 'already_has_partner' as const };
    }
    if (targetUser.partnerId) {
      return { error: 'target_has_partner' as const };
    }

    return {
      name: targetUser.name ?? 'Bambino User',
      imageUrl: targetUser.imageUrl,
    };
  },
});

export const linkPartner = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    await enforceRateLimit(ctx, user._id);

    const normalizedCode = normalizeAndValidateCode(args.code);
    if (!normalizedCode) {
      throw new Error('Please enter a valid share code');
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

    if (user.nameConfirmed !== true) {
      return { error: 'NAME_NOT_CONFIRMED' as const };
    }

    const userIsPremium = user.isPremium === true;
    const targetIsPremium = targetUser.isPremium === true;

    if (!userIsPremium && !targetIsPremium) {
      return { error: 'FREE_TIER_PARTNER_LIMIT' as const };
    }

    const now = Date.now();

    // Burn the target's share code on successful link — the code that just
    // worked has been seen by the calling user, so rotate it for safety.
    const newTargetCode = await generateUniqueShareCode(ctx);

    await ctx.db.patch(user._id, {
      partnerId: targetUser._id,
      updatedAt: now,
    });

    await ctx.db.patch(targetUser._id, {
      partnerId: user._id,
      shareCode: newTargetCode,
      updatedAt: now,
    });

    if (targetIsPremium && user.premiumRevokedAt) {
      await ctx.db.patch(user._id, { premiumRevokedAt: undefined });
    }
    if (userIsPremium && targetUser.premiumRevokedAt) {
      await ctx.db.patch(targetUser._id, { premiumRevokedAt: undefined });
    }

    // Backfill matches: any name both users have already liked becomes a
    // match (#157). Without this, partners who swiped pre-link would see
    // zero matches and assume the feature is broken. Inline for now —
    // typical pre-link queues are small (tens of names).
    const userLikes = await ctx.db
      .query('selections')
      .withIndex('by_user_type', (q) =>
        q.eq('userId', user._id).eq('selectionType', 'like'),
      )
      .collect();
    const targetLikes = await ctx.db
      .query('selections')
      .withIndex('by_user_type', (q) =>
        q.eq('userId', targetUser._id).eq('selectionType', 'like'),
      )
      .collect();

    const userLikedNameIds = new Set(userLikes.map((s) => s.nameId));
    const overlap = targetLikes.filter((s) => userLikedNameIds.has(s.nameId));

    const [u1, u2] =
      user._id < targetUser._id ? [user._id, targetUser._id] : [targetUser._id, user._id];

    for (const sel of overlap) {
      // Defensive: #158 deletes matches on unlink, but a stale row from a
      // data corruption / migration scenario could exist. Skip rather than
      // duplicate.
      const existing = await ctx.db
        .query('matches')
        .withIndex('by_name_users', (q) =>
          q.eq('nameId', sel.nameId).eq('user1Id', u1).eq('user2Id', u2),
        )
        .unique();
      if (existing) continue;

      await ctx.db.insert('matches', {
        nameId: sel.nameId,
        user1Id: u1,
        user2Id: u2,
        matchedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Successful link — reset the attacker counter for this user.
    await resetRateLimit(ctx, user._id);

    return { success: true };
  },
});

/** Lets the user explicitly mint a fresh share code (e.g. if they shared
 *  it with the wrong person). #149 acceptance. */
export const regenerateShareCode = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);

    if (user.partnerId) {
      throw new Error('You already have a partner — share code is no longer needed');
    }

    const newCode = await generateUniqueShareCode(ctx);
    await ctx.db.patch(user._id, {
      shareCode: newCode,
      updatedAt: Date.now(),
    });
    return { shareCode: newCode };
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

    if (partner) {
      const userIsPremium = user.isPremium === true;
      const partnerIsPremium = partner.isPremium === true;

      if (userIsPremium && !partnerIsPremium) {
        await ctx.db.patch(partner._id, { premiumRevokedAt: now });
      } else if (partnerIsPremium && !userIsPremium) {
        await ctx.db.patch(user._id, { premiumRevokedAt: now });
      }
    }

    // Delete every match row between this pair. Keeping them creates two
    // problems on re-link: (1) stale isFavorite/notes/isChosen reappear,
    // (2) recordSelection's by_name_users lookup finds the orphan and
    // suppresses the match toast on a re-like (#158).
    const [u1, u2] =
      user._id < user.partnerId ? [user._id, user.partnerId] : [user.partnerId, user._id];
    const partnerMatches = await ctx.db
      .query('matches')
      .withIndex('by_user1_user2', (q) => q.eq('user1Id', u1).eq('user2Id', u2))
      .collect();
    for (const m of partnerMatches) {
      await ctx.db.delete(m._id);
    }

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
