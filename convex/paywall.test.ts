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
