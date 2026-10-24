/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import schema from './schema';
import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';

const modules = import.meta.glob('./**/*.ts');

async function seedUser(t: ReturnType<typeof convexTest>, clerkId: string) {
  const now = Date.now();
  return await t.run(async (ctx) =>
    ctx.db.insert('users', {
      clerkId,
      email: `${clerkId}@example.test`,
      createdAt: now,
      updatedAt: now,
    }),
  );
}

async function seedTierZeroNames(t: ReturnType<typeof convexTest>, count: number) {
  const now = Date.now();
  return await t.run(async (ctx) => {
    const ids: Id<'names'>[] = [];
    for (let i = 0; i < count; i++) {
      ids.push(
        await ctx.db.insert('names', {
          name: `Name${i}`,
          gender: 'female',
          origin: 'Latin',
          meaning: 'test fixture',
          phonetic: `name${i}`,
          length: 5,
          firstLetter: 'N',
          popularityTier: 0,
          sortKey: i / count,
          createdAt: now,
        }),
      );
    }
    return ids;
  });
}

async function seedRejections(
  t: ReturnType<typeof convexTest>,
  userId: Id<'users'>,
  nameIds: Id<'names'>[],
) {
  const now = Date.now();
  await t.run(async (ctx) => {
    for (const nameId of nameIds) {
      await ctx.db.insert('selections', {
        userId,
        nameId,
        selectionType: 'reject',
        createdAt: now,
        updatedAt: now,
      });
    }
  });
}

describe('getSwipeQueue', () => {
  test('excludes swiped names for a light swiper', async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, 'clerk_light');
    const nameIds = await seedTierZeroNames(t, 20);
    await seedRejections(t, userId, nameIds.slice(0, 5));

    const queue = await t
      .withIdentity({ subject: 'clerk_light' })
      .query(api.selections.getSwipeQueue, { limit: 50, randomSeed: 0 });

    expect(queue.map((n) => n._id)).toEqual(nameIds.slice(5));
  });

  // BAMBINO-6: a user who has swiped past the per-name lookup budget must still
  // get the names they haven't seen (via the bulk selections read).
  test('still finds unswiped names for a heavy swiper', async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, 'clerk_heavy');
    const nameIds = await seedTierZeroNames(t, 1210);
    await seedRejections(t, userId, nameIds.slice(0, 1200));

    const queue = await t
      .withIdentity({ subject: 'clerk_heavy' })
      .query(api.selections.getSwipeQueue, { limit: 50, randomSeed: 0 });

    expect(queue.map((n) => n._id)).toEqual(nameIds.slice(1200));
  });
});
