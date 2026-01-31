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
});
