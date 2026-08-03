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
