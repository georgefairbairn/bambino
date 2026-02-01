import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_clerk_id', ['clerkId'])
    .index('by_email', ['email']),

  names: defineTable({
    name: v.string(),
    gender: v.string(),
    origin: v.string(),
    meaning: v.string(),
    phonetic: v.string(),
    length: v.number(),
    firstLetter: v.string(),
    createdAt: v.number(),
  })
    .index('by_name', ['name'])
    .index('by_gender', ['gender'])
    .index('by_first_letter', ['firstLetter'])
    .index('by_gender_and_first_letter', ['gender', 'firstLetter']),

  sessions: defineTable({
    name: v.string(),
    genderFilter: v.union(
      v.literal('boy'),
      v.literal('girl'),
      v.literal('both')
    ),
    shareCode: v.string(),
    status: v.union(v.literal('active'), v.literal('archived')),
    ownerId: v.id('users'),
    originFilter: v.optional(v.array(v.string())),
    // Legacy filter fields (kept for backward compatibility)
    minLength: v.optional(v.number()),
    maxLength: v.optional(v.number()),
    startingLetters: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_share_code', ['shareCode'])
    .index('by_owner_id', ['ownerId'])
    .index('by_status', ['status']),

  sessionMembers: defineTable({
    sessionId: v.id('sessions'),
    userId: v.id('users'),
    role: v.union(v.literal('owner'), v.literal('partner')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_session_id', ['sessionId'])
    .index('by_user_id', ['userId'])
    .index('by_session_and_user', ['sessionId', 'userId']),

  selections: defineTable({
    sessionId: v.id('sessions'),
    userId: v.id('users'),
    nameId: v.id('names'),
    selectionType: v.union(
      v.literal('like'),
      v.literal('reject'),
      v.literal('skip'),
      v.literal('hidden')
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_session_id', ['sessionId'])
    .index('by_user_session', ['userId', 'sessionId'])
    .index('by_session_name', ['sessionId', 'nameId'])
    .index('by_user_session_type', ['userId', 'sessionId', 'selectionType']),
});
