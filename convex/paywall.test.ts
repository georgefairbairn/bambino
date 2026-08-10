/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
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
  test('a free user sees only the 1 earliest match', async () => {
    const t = convexTest(schema, modules);
    await seedLinkedPairWithMatches(t, 7, false);

    const matches = await t
      .withIdentity({ subject: 'clerk_m_a' })
      .query(api.matches.getMatches, {});

    expect(matches).toHaveLength(1);
    expect(matches.map((m) => m.name.name).sort()).toEqual(['Name0']);
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

    expect(access).toEqual({ total: 7, visible: 1, locked: 6, isPremium: false });
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

describe('partner invite nudge', () => {
  test('getPartnerInfo reports inviteNudgeShown false before it fires', async () => {
    const t = convexTest(schema, modules);
    await seedUser(t, { clerkId: 'clerk_nudge_a', shareCode: 'AAAA2222' });

    const info = await t
      .withIdentity({ subject: 'clerk_nudge_a' })
      .query(api.partners.getPartnerInfo, {});

    expect(info?.inviteNudgeShown).toBe(false);
    expect(info?.shareCode).toBe('AAAA2222');
  });

  test('markInviteNudgeShown latches the flag and is idempotent', async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, { clerkId: 'clerk_nudge_b', shareCode: 'BBBB3333' });
    const asUser = t.withIdentity({ subject: 'clerk_nudge_b' });

    await asUser.mutation(api.users.markInviteNudgeShown, {});
    const first = await t.run(async (ctx) => ctx.db.get(userId));
    expect(first?.inviteNudgeShown).toBe(true);

    // Stamp a sentinel updatedAt so a second write is detectable. Comparing
    // updatedAt before/after would NOT work: both calls land in the same
    // millisecond, so the assertion passes even with the guard deleted.
    await t.run(async (ctx) => ctx.db.patch(userId, { updatedAt: 1 }));

    await asUser.mutation(api.users.markInviteNudgeShown, {});
    const second = await t.run(async (ctx) => ctx.db.get(userId));
    expect(second?.inviteNudgeShown).toBe(true);
    expect(second?.updatedAt).toBe(1);

    const info = await asUser.query(api.partners.getPartnerInfo, {});
    expect(info?.inviteNudgeShown).toBe(true);
  });
});

describe('proposing is premium', () => {
  // finishAllScheduledFunctions drives the scheduler off fake timers.
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  async function firstMatchId(t: ReturnType<typeof convexTest>): Promise<Id<'matches'>> {
    return await t.run(async (ctx) => {
      const all = await ctx.db.query('matches').collect();
      return all[0]!._id;
    });
  }

  async function readMatch(t: ReturnType<typeof convexTest>, matchId: Id<'matches'>) {
    return await t.run(async (ctx) => ctx.db.get(matchId));
  }

  test('a free user cannot propose', async () => {
    const t = convexTest(schema, modules);
    await seedLinkedPairWithMatches(t, 3, false);
    const matchId = await firstMatchId(t);

    await expect(
      t.withIdentity({ subject: 'clerk_m_a' }).mutation(api.matches.proposeName, { matchId }),
    ).rejects.toThrow(/PREMIUM_REQUIRED/);
  });

  test('a premium user can propose', async () => {
    const t = convexTest(schema, modules);
    await seedLinkedPairWithMatches(t, 3, true);
    const matchId = await firstMatchId(t);

    await t.withIdentity({ subject: 'clerk_m_a' }).mutation(api.matches.proposeName, { matchId });
    // proposeName schedules a push-notification action. Drain it inside the
    // test or the scheduler's own bookkeeping write lands after the transaction
    // closes and convex-test throws "Write outside of transaction" — a race that
    // passed locally and failed in CI.
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const match = await readMatch(t, matchId);
    expect(match?.proposalStatus).toBe('pending');
  });

  test('a free user whose partner is premium can propose', async () => {
    const t = convexTest(schema, modules);
    // seedLinkedPairWithMatches marks BOTH premium; set only B so we exercise
    // premium propagating from partner to the free user.
    const { aId, bId } = await seedLinkedPairWithMatches(t, 3, false);
    await t.run(async (ctx) => {
      await ctx.db.patch(bId, { isPremium: true });
      await ctx.db.patch(aId, { isPremium: false });
    });
    const matchId = await firstMatchId(t);

    await t.withIdentity({ subject: 'clerk_m_a' }).mutation(api.matches.proposeName, { matchId });
    // proposeName schedules a push-notification action. Drain it inside the
    // test or the scheduler's own bookkeeping write lands after the transaction
    // closes and convex-test throws "Write outside of transaction" — a race that
    // passed locally and failed in CI.
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const match = await readMatch(t, matchId);
    expect(match?.proposalStatus).toBe('pending');
  });
});
