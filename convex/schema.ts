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
    // Filter-discovery nudge (one-time). hasOpenedFilters: true once the user
    // has ever opened the Filters screen — disqualifies the swipe-screen nudge
    // and retires its first-visit banner. filterNudgeShown: true once the nudge
    // has been shown. On the user row (not AsyncStorage) so "show once" means
    // once per user across devices/reinstalls, like onboardingCompleted.
    hasOpenedFilters: v.optional(v.boolean()),
    filterNudgeShown: v.optional(v.boolean()),
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
    // Category filter (#293). Same semantics as originFilter: undefined/empty = all-on
    // (no filter), a subset = name must match >=1 selected category.
    categoryFilter: v.optional(v.array(v.string())),
    pushToken: v.optional(v.string()),
    pushTokenPlatform: v.optional(v.union(v.literal('ios'), v.literal('android'))),
    // Absent = enabled; only an explicit false opts out of push (#229).
    pushNotificationsEnabled: v.optional(v.boolean()),
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
    // Category membership (#293). Readable array is the source of truth for the
    // swipe-queue post-filter and name-detail display; categoryMask is the same
    // set as a bitmask (see convex/categories.ts) used for filtered counts.
    categories: v.optional(v.array(v.string())),
    categoryMask: v.optional(v.number()),
    // Curated celebrity association string, shown in name-detail when present.
    celebrityNote: v.optional(v.string()),
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
    // Denormalized from names.categoryMask at insert (#293), mirroring origin/gender,
    // so getFilteredNameCount can subtract actioned names per category without
    // fetching each name doc.
    categoryMask: v.optional(v.number()),
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

  // Pre-computed name counts per (categoryMask, gender, origin) so the Filters
  // screen's "Names available" counter can reflect the category selection in
  // O(stats + actioned) instead of scanning names. Rebuilt by
  // names:rebuildNameCategoryStats after categories are (re)computed. A name sits
  // in exactly one categoryMask bucket, so summing rows whose mask intersects the
  // selected set is exact even when categories overlap.
  nameCategoryStats: defineTable({
    categoryMask: v.number(),
    gender: v.string(),
    origin: v.string(),
    count: v.number(),
    updatedAt: v.number(),
  }).index('by_mask_gender_origin', ['categoryMask', 'gender', 'origin']),

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

  // Per-user throttle for submitFeedback (#171). One row per user, holding the
  // timestamp of their last successful submission. Enforces a minimum gap
  // between feedback messages so a user can't flood the Slack channel.
  feedbackRateLimits: defineTable({
    userId: v.id('users'),
    lastSubmittedAt: v.number(),
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
    // Set true when the proposer dismisses the declined-note banner. Hides the
    // banner only — the Rejected tag and the detail-sheet note persist until
    // the name is re-proposed (which clears this back to undefined).
    declineNoteDismissed: v.optional(v.boolean()),
    matchedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user1', ['user1Id'])
    .index('by_user2', ['user2Id'])
    .index('by_name_users', ['nameId', 'user1Id', 'user2Id'])
    .index('by_user1_user2', ['user1Id', 'user2Id']),
});
