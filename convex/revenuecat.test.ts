/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import schema from './schema';
import { api, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { appUserIdsFromEvent, isEntitlementActive } from './revenuecat';

const modules = import.meta.glob('./**/*.ts');

const NOW = Date.parse('2026-09-27T12:00:00Z');

async function seedUser(
  t: ReturnType<typeof convexTest>,
  opts: { clerkId: string; isPremium?: boolean; partnerId?: Id<'users'> },
): Promise<Id<'users'>> {
  return await t.run((ctx) =>
    ctx.db.insert('users', {
      clerkId: opts.clerkId,
      email: `${opts.clerkId}@example.test`,
      isPremium: opts.isPremium,
      partnerId: opts.partnerId,
      createdAt: NOW,
      updatedAt: NOW,
    }),
  );
}

/** Stubs RevenueCat's subscriber lookup with each id's entitlement, if any. */
function stubRevenueCat(entitlements: Record<string, { expires_date: string | null }>) {
  const fetchMock = vi.fn(async (url: string) => {
    const id = decodeURIComponent(url.split('/subscribers/')[1]!);
    const premium = entitlements[id];
    return new Response(
      JSON.stringify({ subscriber: { entitlements: premium ? { premium } : {} } }),
      { status: 200 },
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.stubEnv('REVENUECAT_SECRET_API_KEY', 'sk_test');
  vi.stubEnv('REVENUECAT_WEBHOOK_AUTH', 'Bearer webhook_secret');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('isEntitlementActive', () => {
  test('a lifetime entitlement, with no expiry, is active', () => {
    expect(isEntitlementActive({ entitlements: { premium: { expires_date: null } } }, NOW)).toBe(
      true,
    );
  });

  test('an entitlement is active until its expiry passes', () => {
    const future = { entitlements: { premium: { expires_date: '2026-10-01T00:00:00Z' } } };
    const past = { entitlements: { premium: { expires_date: '2026-09-01T00:00:00Z' } } };
    expect(isEntitlementActive(future, NOW)).toBe(true);
    expect(isEntitlementActive(past, NOW)).toBe(false);
  });

  test('no premium entitlement, or no subscriber, is not premium', () => {
    expect(isEntitlementActive({ entitlements: {} }, NOW)).toBe(false);
    expect(isEntitlementActive(undefined, NOW)).toBe(false);
  });
});

describe('appUserIdsFromEvent', () => {
  test('collects every account an event touches, once each, skipping anonymous ids', () => {
    expect(
      appUserIdsFromEvent({
        app_user_id: 'user_a',
        original_app_user_id: '$RCAnonymousID:abc',
        aliases: ['user_a', '$RCAnonymousID:abc'],
        transferred_from: ['user_b'],
        transferred_to: ['user_a'],
      }),
    ).toEqual(['user_a', 'user_b']);
  });
});

describe('setPremiumFromRevenueCat', () => {
  test('grants premium', async () => {
    const t = convexTest(schema, modules);
    const id = await seedUser(t, { clerkId: 'user_buyer' });
    await t.mutation(internal.revenuecat.setPremiumFromRevenueCat, {
      clerkId: 'user_buyer',
      isPremium: true,
    });
    const user = await t.run((ctx) => ctx.db.get(id));
    expect(user?.isPremium).toBe(true);
    expect(user?.purchasedAt).toBeTypeOf('number');
  });

  test('a refund revokes premium and starts the partner grace period', async () => {
    const t = convexTest(schema, modules);
    const partnerId = await seedUser(t, { clerkId: 'user_partner' });
    const buyerId = await seedUser(t, { clerkId: 'user_refunded', isPremium: true, partnerId });
    await t.mutation(internal.revenuecat.setPremiumFromRevenueCat, {
      clerkId: 'user_refunded',
      isPremium: false,
    });
    const buyer = await t.run((ctx) => ctx.db.get(buyerId));
    const partner = await t.run((ctx) => ctx.db.get(partnerId));
    expect(buyer?.isPremium).toBe(false);
    expect(partner?.premiumRevokedAt).toBeTypeOf('number');
  });

  test('a repeat event changes nothing', async () => {
    const t = convexTest(schema, modules);
    const id = await seedUser(t, { clerkId: 'user_repeat', isPremium: true });
    await t.run((ctx) => ctx.db.patch(id, { purchasedAt: 1 }));
    await t.mutation(internal.revenuecat.setPremiumFromRevenueCat, {
      clerkId: 'user_repeat',
      isPremium: true,
    });
    const user = await t.run((ctx) => ctx.db.get(id));
    expect(user?.purchasedAt).toBe(1);
  });

  test('ignores a purchaser with no Bambino account', async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(internal.revenuecat.setPremiumFromRevenueCat, {
        clerkId: 'user_unknown',
        isPremium: true,
      }),
    ).resolves.toBeNull();
  });
});

describe('syncPremium', () => {
  test('grants premium only when RevenueCat confirms the purchase', async () => {
    const t = convexTest(schema, modules);
    const paidId = await seedUser(t, { clerkId: 'user_paid' });
    const claimsId = await seedUser(t, { clerkId: 'user_claims' });
    stubRevenueCat({ user_paid: { expires_date: null } });

    expect(await t.withIdentity({ subject: 'user_paid' }).action(api.revenuecat.syncPremium)).toBe(
      true,
    );
    expect(
      await t.withIdentity({ subject: 'user_claims' }).action(api.revenuecat.syncPremium),
    ).toBe(false);

    expect((await t.run((ctx) => ctx.db.get(paidId)))?.isPremium).toBe(true);
    expect((await t.run((ctx) => ctx.db.get(claimsId)))?.isPremium).not.toBe(true);
  });

  test('looks the purchaser up by their Clerk id, with the secret key', async () => {
    const t = convexTest(schema, modules);
    await seedUser(t, { clerkId: 'user_lookup' });
    const fetchMock = stubRevenueCat({});
    await t.withIdentity({ subject: 'user_lookup' }).action(api.revenuecat.syncPremium);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.revenuecat.com/v1/subscribers/user_lookup');
    expect(init.headers).toEqual({ Authorization: 'Bearer sk_test' });
  });
});

describe('webhook', () => {
  const post = (t: ReturnType<typeof convexTest>, body: unknown, auth = 'Bearer webhook_secret') =>
    t.fetch('/revenuecat', {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  test('rejects a request without the shared secret', async () => {
    const t = convexTest(schema, modules);
    const response = await post(t, { event: { type: 'INITIAL_PURCHASE' } }, 'Bearer wrong');
    expect(response.status).toBe(401);
  });

  test('a purchase event grants premium', async () => {
    const t = convexTest(schema, modules);
    const id = await seedUser(t, { clerkId: 'user_hooked' });
    stubRevenueCat({ user_hooked: { expires_date: null } });
    const response = await post(t, {
      event: { type: 'NON_RENEWING_PURCHASE', app_user_id: 'user_hooked' },
    });
    expect(response.status).toBe(200);
    expect((await t.run((ctx) => ctx.db.get(id)))?.isPremium).toBe(true);
  });

  test('a refund event revokes premium', async () => {
    const t = convexTest(schema, modules);
    const id = await seedUser(t, { clerkId: 'user_refund', isPremium: true });
    stubRevenueCat({});
    await post(t, { event: { type: 'CANCELLATION', app_user_id: 'user_refund' } });
    expect((await t.run((ctx) => ctx.db.get(id)))?.isPremium).toBe(false);
  });

  test("answers the dashboard's test event without looking anyone up", async () => {
    const t = convexTest(schema, modules);
    const fetchMock = stubRevenueCat({});
    const response = await post(t, { event: { type: 'TEST', app_user_id: 'user_x' } });
    expect(response.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
