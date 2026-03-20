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
    shareCode: v.optional(v.string()),
    partnerId: v.optional(v.id('users')),
    genderFilter: v.optional(v.union(v.literal('boy'), v.literal('girl'), v.literal('both'))),
    originFilter: v.optional(v.array(v.string())),
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
    createdAt: v.number(),
  })
    .index('by_name', ['name'])
    .index('by_gender', ['gender'])
    .index('by_first_letter', ['firstLetter'])
    .index('by_gender_and_first_letter', ['gender', 'firstLetter']),

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
    .index('by_name_gender_year', ['name', 'gender', 'year']),

  selections: defineTable({
    userId: v.id('users'),
    nameId: v.id('names'),
    selectionType: v.union(
      v.literal('like'),
      v.literal('reject'),
      v.literal('skip'),
      v.literal('hidden'),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_name', ['userId', 'nameId'])
    .index('by_user_type', ['userId', 'selectionType']),

  matches: defineTable({
    nameId: v.id('names'),
    user1Id: v.id('users'),
    user2Id: v.id('users'),
    isFavorite: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    rank: v.optional(v.number()),
    isChosen: v.optional(v.boolean()),
    matchedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user1', ['user1Id'])
    .index('by_user2', ['user2Id'])
    .index('by_name_users', ['nameId', 'user1Id', 'user2Id']),
});
