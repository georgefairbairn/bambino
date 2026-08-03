/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import schema from './schema';
import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';

const modules = import.meta.glob('./**/*.ts');

type SeedUserOpts = {
  clerkId: string;
  isPremium?: boolean;
  partnerId?: Id<'users'>;
  nameConfirmed?: boolean;
  shareCode?: string;
  lifetimeSwipeCount?: number;
  premiumRevokedAt?: number;
};

export async function seedUser(
  t: ReturnType<typeof convexTest>,
  opts: SeedUserOpts,
): Promise<Id<'users'>> {
  const now = Date.now();
  return await t.run(async (ctx) =>
    ctx.db.insert('users', {
      clerkId: opts.clerkId,
      email: `${opts.clerkId}@example.test`,
      isPremium: opts.isPremium,
      partnerId: opts.partnerId,
      nameConfirmed: opts.nameConfirmed ?? true,
      shareCode: opts.shareCode,
      lifetimeSwipeCount: opts.lifetimeSwipeCount,
      premiumRevokedAt: opts.premiumRevokedAt,
      createdAt: now,
      updatedAt: now,
    }),
  );
}

export async function seedName(
  t: ReturnType<typeof convexTest>,
  name: string,
): Promise<Id<'names'>> {
  const now = Date.now();
  return await t.run(async (ctx) =>
    ctx.db.insert('names', {
      name,
      gender: 'girl',
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

describe('test harness', () => {
  test('can seed a user and read it back', async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, { clerkId: 'clerk_smoke' });
    const stored = await t.run(async (ctx) => ctx.db.get(userId));
    expect(stored?.email).toBe('clerk_smoke@example.test');
  });
});

describe('free tier swiping', () => {
  test('a free user can swipe past the old 25-swipe cap', async () => {
    const t = convexTest(schema, modules);
    await seedUser(t, { clerkId: 'clerk_free', isPremium: false, lifetimeSwipeCount: 25 });
    const nameId = await seedName(t, 'Aurora');

    const asFree = t.withIdentity({ subject: 'clerk_free' });
    const result = await asFree.mutation(api.selections.recordSelection, {
      nameId,
      selectionType: 'like',
    });

    expect(result).not.toHaveProperty('error');
  });

  test('lifetimeSwipeCount still increments (kept for analytics)', async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, {
      clerkId: 'clerk_counter',
      isPremium: false,
      lifetimeSwipeCount: 0,
    });
    const nameId = await seedName(t, 'Rowan');

    await t
      .withIdentity({ subject: 'clerk_counter' })
      .mutation(api.selections.recordSelection, { nameId, selectionType: 'like' });

    const stored = await t.run(async (ctx) => ctx.db.get(userId));
    expect(stored?.lifetimeSwipeCount).toBe(1);
  });
});

describe('partner linking', () => {
  test('two free users can link to each other', async () => {
    const t = convexTest(schema, modules);
    await seedUser(t, { clerkId: 'clerk_a', isPremium: false, nameConfirmed: true });
    const bId = await seedUser(t, {
      clerkId: 'clerk_b',
      isPremium: false,
      nameConfirmed: true,
      shareCode: 'ABCD2345',
    });

    // NOTE: the mutation arg is `code`, not `shareCode` (convex/partners.ts:233).
    const result = await t
      .withIdentity({ subject: 'clerk_a' })
      .mutation(api.partners.linkPartner, { code: 'ABCD2345' });

    expect(result).not.toHaveProperty('error');

    const b = await t.run(async (ctx) => ctx.db.get(bId));
    expect(b?.partnerId).toBeDefined();
  });

  test('reciprocal premium still applies when one side pays', async () => {
    const t = convexTest(schema, modules);
    await seedUser(t, {
      clerkId: 'clerk_paid',
      isPremium: true,
      nameConfirmed: true,
    });
    const bId = await seedUser(t, {
      clerkId: 'clerk_unpaid',
      isPremium: false,
      nameConfirmed: true,
      shareCode: 'WXYZ6789',
      premiumRevokedAt: Date.now(),
    });

    await t
      .withIdentity({ subject: 'clerk_paid' })
      .mutation(api.partners.linkPartner, { code: 'WXYZ6789' });

    const b = await t.run(async (ctx) => ctx.db.get(bId));
    expect(b?.premiumRevokedAt).toBeUndefined();
  });
});

async function seedLinkedPairWithMatches(
  t: ReturnType<typeof convexTest>,
  matchCount: number,
  isPremium: boolean | { aPremium?: boolean; bPremium?: boolean } = false,
) {
  const aPremium = typeof isPremium === 'boolean' ? isPremium : (isPremium.aPremium ?? false);
  const bPremium = typeof isPremium === 'boolean' ? isPremium : (isPremium.bPremium ?? false);
  const aId = await seedUser(t, { clerkId: 'clerk_m_a', isPremium: aPremium });
  const bId = await seedUser(t, { clerkId: 'clerk_m_b', isPremium: bPremium });
  await t.run(async (ctx) => {
    await ctx.db.patch(aId, { partnerId: bId });
    await ctx.db.patch(bId, { partnerId: aId });
  });

  // Canonical ordering: user1Id < user2Id
  const [user1Id, user2Id] = aId < bId ? [aId, bId] : [bId, aId];

  for (let i = 0; i < matchCount; i++) {
    const nameId = await seedName(t, `Name${i}`);
    await t.run(async (ctx) =>
      ctx.db.insert('matches', {
        nameId,
        user1Id,
        user2Id,
        matchedAt: 1000 + i, // ascending: Name0 is earliest
        createdAt: 1000 + i,
        updatedAt: 1000 + i,
      }),
    );
  }
  return { aId, bId };
}

describe('free tier match visibility', () => {
  test('a free user sees only the 3 earliest matches', async () => {
    const t = convexTest(schema, modules);
    await seedLinkedPairWithMatches(t, 7, false);

    const matches = await t
      .withIdentity({ subject: 'clerk_m_a' })
      .query(api.matches.getMatches, {});

    expect(matches).toHaveLength(3);
    expect(matches.map((m) => m.name.name).sort()).toEqual(['Name0', 'Name1', 'Name2']);
  });

  test('a premium user sees all matches', async () => {
    const t = convexTest(schema, modules);
    await seedLinkedPairWithMatches(t, 7, true);

    const matches = await t
      .withIdentity({ subject: 'clerk_m_a' })
      .query(api.matches.getMatches, {});

    expect(matches).toHaveLength(7);
  });

  test('search cannot surface a locked match', async () => {
    const t = convexTest(schema, modules);
    await seedLinkedPairWithMatches(t, 7, false);

    const matches = await t
      .withIdentity({ subject: 'clerk_m_a' })
      .query(api.matches.getMatches, { search: 'Name6' });

    expect(matches).toHaveLength(0);
  });

  test('getMatchAccess reports the locked count', async () => {
    const t = convexTest(schema, modules);
    await seedLinkedPairWithMatches(t, 7, false);

    const access = await t
      .withIdentity({ subject: 'clerk_m_a' })
      .query(api.matches.getMatchAccess, {});

    expect(access).toEqual({ total: 7, visible: 3, locked: 4, isPremium: false });
  });

  test('getMatchAccess is all-zero without a partner', async () => {
    const t = convexTest(schema, modules);
    await seedUser(t, { clerkId: 'clerk_solo', isPremium: false });

    const access = await t
      .withIdentity({ subject: 'clerk_solo' })
      .query(api.matches.getMatchAccess, {});

    expect(access).toEqual({ total: 0, visible: 0, locked: 0, isPremium: false });
  });

  // Regression test for finding 1: the no-partner early return must still
  // reflect the real premium status (a payer without a linked partner was
  // previously shown isPremium: false).
  test('getMatchAccess returns isPremium: true for a premium solo user (no partner)', async () => {
    const t = convexTest(schema, modules);
    await seedUser(t, { clerkId: 'clerk_premium_solo', isPremium: true });

    const access = await t
      .withIdentity({ subject: 'clerk_premium_solo' })
      .query(api.matches.getMatchAccess, {});

    expect(access).toEqual({ total: 0, visible: 0, locked: 0, isPremium: true });
  });

  // Finding 4 (second case): a premium user who IS linked sees all matches
  // visible with locked: 0.
  test('getMatchAccess shows all matches unlocked for a premium linked user', async () => {
    const t = convexTest(schema, modules);
    await seedLinkedPairWithMatches(t, 5, true);

    const access = await t
      .withIdentity({ subject: 'clerk_m_a' })
      .query(api.matches.getMatchAccess, {});

    expect(access).toEqual({ total: 5, visible: 5, locked: 0, isPremium: true });
  });
});

// Finding 5: the highest-risk uncovered seam — free user linked to a PREMIUM
// partner gets full match access via reciprocal premium.
describe('reciprocal premium match access', () => {
  test('free user with premium partner sees all matches (getMatches + getMatchAccess)', async () => {
    const t = convexTest(schema, modules);
    // clerk_m_a = free, clerk_m_b = premium
    await seedLinkedPairWithMatches(t, 7, { aPremium: false, bPremium: true });

    // As the FREE side, all 7 matches should be returned by getMatches
    const matches = await t
      .withIdentity({ subject: 'clerk_m_a' })
      .query(api.matches.getMatches, {});

    expect(matches).toHaveLength(7);

    // And getMatchAccess should report isPremium: true with locked: 0
    const access = await t
      .withIdentity({ subject: 'clerk_m_a' })
      .query(api.matches.getMatchAccess, {});

    expect(access).toEqual({ total: 7, visible: 7, locked: 0, isPremium: true });
  });
});
