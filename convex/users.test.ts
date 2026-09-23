/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import schema from './schema';
import { api } from './_generated/api';

const modules = import.meta.glob('./**/*.ts');

describe('createOrUpdateUser', () => {
  test('reports created on the first sync', async () => {
    const t = convexTest(schema, modules);
    const asNew = t.withIdentity({ subject: 'clerk_new' });

    const result = await asNew.mutation(api.users.createOrUpdateUser, {
      email: 'new@example.test',
    });

    expect(result.created).toBe(true);
    const row = await t.run((ctx) => ctx.db.get(result.userId));
    expect(row?.clerkId).toBe('clerk_new');
  });

  test('does not report created when the user already exists', async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ subject: 'clerk_repeat' });

    const first = await asUser.mutation(api.users.createOrUpdateUser, {
      email: 'repeat@example.test',
    });
    const second = await asUser.mutation(api.users.createOrUpdateUser, {
      email: 'repeat@example.test',
    });

    expect(second.created).toBe(false);
    expect(second.userId).toBe(first.userId);
  });

  test('does not report created when healing duplicate rows', async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();
    const seed = () =>
      t.run((ctx) =>
        ctx.db.insert('users', {
          clerkId: 'clerk_dup',
          email: 'dup@example.test',
          createdAt: now,
          updatedAt: now,
        }),
      );
    const oldest = await seed();
    await seed();

    const result = await t
      .withIdentity({ subject: 'clerk_dup' })
      .mutation(api.users.createOrUpdateUser, { email: 'dup@example.test' });

    expect(result).toEqual({ userId: oldest, created: false });
    const rows = await t.run((ctx) =>
      ctx.db
        .query('users')
        .withIndex('by_clerk_id', (q) => q.eq('clerkId', 'clerk_dup'))
        .collect(),
    );
    expect(rows).toHaveLength(1);
  });
});
