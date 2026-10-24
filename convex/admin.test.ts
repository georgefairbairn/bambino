/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import schema from './schema';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';

const modules = import.meta.glob('./**/*.ts');

const DEMO_EMAILS = [
  'appreview@bambinobaby.xyz',
  'appreview-partner@bambinobaby.xyz',
  'appreview-iap@bambinobaby.xyz',
];
const SEEDED_NAMES = ['Olivia', 'Emma', 'Liam', 'Ava', 'Benjamin', 'Aaron', 'Zelda'];

async function seed(t: ReturnType<typeof convexTest>) {
  const now = Date.now();
  return await t.run(async (ctx) => {
    const ids: Id<'users'>[] = [];
    for (const email of DEMO_EMAILS) {
      ids.push(
        await ctx.db.insert('users', {
          clerkId: email,
          email,
          createdAt: now,
          updatedAt: now,
        }),
      );
    }
    const nameIds: Id<'names'>[] = [];
    for (const name of SEEDED_NAMES) {
      nameIds.push(
        await ctx.db.insert('names', {
          name,
          gender: 'female',
          origin: 'Latin',
          meaning: 'test fixture',
          phonetic: name.toLowerCase(),
          length: name.length,
          firstLetter: name[0]!,
          sortKey: Math.random(),
          createdAt: now,
        }),
      );
    }
    return { ids, nameIds };
  });
}

describe('resetAppReviewDemo', () => {
  test("wipes reviewers' changes and re-seeds the demo pair", async () => {
    const t = convexTest(schema, modules);
    const { ids, nameIds } = await seed(t);
    const [reviewerId, partnerId, iapId] = ids as [Id<'users'>, Id<'users'>, Id<'users'>];
    const zeldaId = nameIds[SEEDED_NAMES.indexOf('Zelda')]!;

    // Simulate a previous review: IAP account bought premium and swiped,
    // reviewer unlinked and changed filters.
    const now = Date.now();
    await t.run(async (ctx) => {
      await ctx.db.patch(iapId, { isPremium: true, purchasedAt: now, likedCount: 1 });
      await ctx.db.patch(reviewerId, { genderFilter: 'boy', inviteNudgeShown: true });
      await ctx.db.insert('selections', {
        userId: iapId,
        nameId: zeldaId,
        selectionType: 'like',
        createdAt: now,
        updatedAt: now,
      });
    });

    const result = await t.mutation(internal.admin.resetAppReviewDemo, {});
    expect(result).not.toHaveProperty('error');

    const [reviewer, partner, iap] = await t.run(async (ctx) =>
      Promise.all([ctx.db.get(reviewerId), ctx.db.get(partnerId), ctx.db.get(iapId)]),
    );
    expect(reviewer?.partnerId).toBe(partnerId);
    expect(partner?.partnerId).toBe(reviewerId);
    expect(reviewer?.genderFilter).toBeUndefined();
    expect(reviewer?.inviteNudgeShown).toBeUndefined();
    expect(reviewer?.likedCount).toBe(4); // Olivia, Emma, Liam, Ava
    expect(reviewer?.rejectedCount).toBe(1); // Aaron

    expect(iap?.isPremium).toBeUndefined();
    expect(iap?.partnerId).toBeUndefined();
    expect(iap?.likedCount).toBe(0);
    const iapSelections = await t.run(async (ctx) =>
      ctx.db
        .query('selections')
        .withIndex('by_user', (q) => q.eq('userId', iapId))
        .collect(),
    );
    expect(iapSelections).toHaveLength(0);

    const matches = await t.run(async (ctx) => ctx.db.query('matches').collect());
    expect(matches).toHaveLength(3); // Olivia, Emma, Liam
    expect(matches.filter((m) => m.proposalStatus === 'pending')).toHaveLength(1);

    // Running it again is stable.
    await t.mutation(internal.admin.resetAppReviewDemo, {});
    const again = await t.run(async (ctx) => ctx.db.query('matches').collect());
    expect(again).toHaveLength(3);
  });
});
