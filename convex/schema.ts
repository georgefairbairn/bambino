import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    isPremium: v.optional(v.boolean()),
    purchasedAt: v.optional(v.number()),
    premiumRevokedAt: v.optional(v.number()),
    nameConfirmed: v.optional(v.boolean()),
    // True once the user has completed the in-app onboarding carousel.
    // Stored per-account (not AsyncStorage) so a sign-out + sign-in on
    // the same device doesn't re-trigger onboarding, and a fresh device
    // doesn't skip it. (#154)
    onboardingCompleted: v.optional(v.boolean()),
    // Running counters for getSelectionStats (#183). Kept in sync by every
    // mutation that inserts/deletes/changes a selection. Backfilled lazily
    // on first counter-touching mutation per user.
    likedCount: v.optional(v.number()),
    rejectedCount: v.optional(v.number()),
    skippedCount: v.optional(v.number()),
    // Monotonic count of swipes ever recorded — only ever increments, never
    // decremented by undo. Gates the free-tier swipe limit so undo can't be
    // used to ratchet past the cap indefinitely (#165).
    lifetimeSwipeCount: v.optional(v.number()),
    shareCode: v.optional(v.string()),
    partnerId: v.optional(v.id('users')),
    genderFilter: v.optional(v.union(v.literal('boy'), v.literal('girl'), v.literal('both'))),
    originFilter: v.optional(v.array(v.string())),
    pushToken: v.optional(v.string()),
    pushTokenPlatform: v.optional(v.union(v.literal('ios'), v.literal('android'))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_clerk_id', ['clerkId'])
    .index('by_email', ['email'])
    .index('by_share_code', ['shareCode'])
    .index('by_partner_id', ['partnerId']),

  names: defineTable({
    name: v.string(),
    gender: v.string(),
    origin: v.string(),
    meaning: v.string(),
    phonetic: v.string(),
    length: v.number(),
    firstLetter: v.string(),
    currentRank: v.optional(v.number()),
    primaryGender: v.optional(v.union(v.literal('male'), v.literal('female'))),
    // Bucket derived from currentRank for the tiered swipe queue.
    // 0 = top 1000, 1 = ranks 1001–5000, 2 = ranks 5001+, undefined = no rank.
    // Kept in sync by update-ranks.ts and backfill-ranks.ts.
    popularityTier: v.optional(v.number()),
    sortKey: v.number(),
    createdAt: v.number(),
  })
    .index('by_name', ['name'])
    .index('by_gender', ['gender'])
    .index('by_first_letter', ['firstLetter'])
    .index('by_gender_and_first_letter', ['gender', 'firstLetter'])
    .index('by_origin', ['origin'])
    .index('by_gender_origin', ['gender', 'origin'])
    .index('by_sort_key', ['sortKey'])
    .index('by_gender_sort_key', ['gender', 'sortKey'])
    .index('by_tier_sort_key', ['popularityTier', 'sortKey'])
    .index('by_gender_tier_sort_key', ['gender', 'popularityTier', 'sortKey']),

  namePopularity: defineTable({
    name: v.string(),
    gender: v.string(),
    year: v.number(),
    rank: v.number(),
    count: v.number(),
    createdAt: v.number(),
  })
    .index('by_name_gender', ['name', 'gender'])
    .index('by_year_gender', ['year', 'gender'])
    .index('by_name_gender_year', ['name', 'gender', 'year'])
    .index('by_year_gender_rank', ['year', 'gender', 'rank']),

  selections: defineTable({
    userId: v.id('users'),
    nameId: v.id('names'),
    selectionType: v.union(
      v.literal('like'),
      v.literal('reject'),
      v.literal('skip'),
      v.literal('hidden'),
    ),
    // Denormalized from the names table so getOriginCounts /
    // getFilteredNameCount can compute "remaining" counts without
    // scanning the full names DB. Kept in sync by:
    //   - selection insert paths (read once from names on insert)
    //   - names:updateNameOrigin (when a name's origin is corrected)
    origin: v.optional(v.string()),
    gender: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_name', ['userId', 'nameId'])
    .index('by_user_type', ['userId', 'selectionType'])
    .index('by_user_createdAt', ['userId', 'createdAt'])
    // undoLastSelection orders by this so "undo" targets the most recently
    // *actioned* selection (re-swiping an old name patches updatedAt), not
    // the most recently created one (#225).
    .index('by_user_updatedAt', ['userId', 'updatedAt'])
    .index('by_name', ['nameId']),

  // Pre-computed total count of names per (origin, gender) so the
  // Filters screen can render origin counts in O(stats + actioned)
  // instead of O(all names). Kept in sync by:
  //   - names:populateOriginStats (initial seed)
  //   - names:updateNameOrigin (corrections)
  // We don't currently mutate the names table at runtime, so there's
  // no insert/delete sync path; if you add one, update this table too.
  nameOriginStats: defineTable({
    origin: v.string(),
    gender: v.string(),
    count: v.number(),
    updatedAt: v.number(),
  }).index('by_origin_gender', ['origin', 'gender']),

  // Per-user rate limit state for share-code lookups and linking.
  // Tracks attempts within a 1-minute sliding window; on too many failures,
  // sets lockedUntil with exponential backoff. See convex/partners.ts.
  shareCodeAttempts: defineTable({
    userId: v.id('users'),
    attempts: v.number(),
    windowStart: v.number(),
    // Number of times this user has hit the lock — drives backoff length.
    lockoutCount: v.number(),
    lockedUntil: v.optional(v.number()),
  }).index('by_user', ['userId']),

  matches: defineTable({
    nameId: v.id('names'),
    user1Id: v.id('users'),
    user2Id: v.id('users'),
    isFavorite: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    rank: v.optional(v.number()),
    isChosen: v.optional(v.boolean()),
    proposedBy: v.optional(v.id('users')),
    proposedAt: v.optional(v.number()),
    proposalMessage: v.optional(v.string()),
    proposalStatus: v.optional(
      v.union(v.literal('pending'), v.literal('accepted'), v.literal('declined')),
    ),
    respondedAt: v.optional(v.number()),
    declineMessage: v.optional(v.string()),
    matchedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user1', ['user1Id'])
    .index('by_user2', ['user2Id'])
    .index('by_name_users', ['nameId', 'user1Id', 'user2Id'])
    .index('by_user1_user2', ['user1Id', 'user2Id']),
});
