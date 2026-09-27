import { v } from 'convex/values';
import { internal } from './_generated/api';
import { action, httpAction, internalMutation } from './_generated/server';
import { applyPremiumChange } from './premium';

/** Must match ENTITLEMENT_ID in constants/purchases.ts. */
const ENTITLEMENT_ID = 'premium';

const SUBSCRIBERS_URL = 'https://api.revenuecat.com/v1/subscribers/';

/** RevenueCat's id for a purchaser the app hasn't logged in yet. */
const ANONYMOUS_PREFIX = '$RCAnonymousID:';

type Entitlement = { expires_date?: string | null };
type Subscriber = { entitlements?: Record<string, Entitlement> };

/** Lifetime entitlements have no expiry date; others are active until it passes. */
export function isEntitlementActive(subscriber: Subscriber | undefined, now: number): boolean {
  const entitlement = subscriber?.entitlements?.[ENTITLEMENT_ID];
  if (!entitlement) return false;
  const expires = entitlement.expires_date;
  return expires == null || Date.parse(expires) > now;
}

type WebhookEvent = {
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  transferred_from?: string[];
  transferred_to?: string[];
};

/**
 * Every Bambino account a webhook event can affect. The app logs purchasers in
 * with their Clerk id, so anonymous ids never match a user. A transfer moves a
 * purchase between accounts, so both sides need rechecking.
 */
export function appUserIdsFromEvent(event: WebhookEvent): string[] {
  const ids = [
    event.app_user_id,
    event.original_app_user_id,
    ...(event.aliases ?? []),
    ...(event.transferred_from ?? []),
    ...(event.transferred_to ?? []),
  ];
  return [
    ...new Set(
      ids.filter((id): id is string => typeof id === 'string' && !id.startsWith(ANONYMOUS_PREFIX)),
    ),
  ];
}

/**
 * Asks RevenueCat whether this purchaser has premium right now. Webhooks are
 * only a nudge to look again: RevenueCat recommends reading the current state
 * rather than applying each event, which handles refunds, expiries and
 * out-of-order delivery the same way.
 */
async function hasPremium(appUserId: string): Promise<boolean> {
  const key = process.env.REVENUECAT_SECRET_API_KEY;
  if (!key) throw new Error('REVENUECAT_SECRET_API_KEY is not set');
  const response = await fetch(SUBSCRIBERS_URL + encodeURIComponent(appUserId), {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!response.ok) {
    throw new Error(`RevenueCat subscriber lookup failed: ${response.status}`);
  }
  const body = (await response.json()) as { subscriber?: Subscriber };
  return isEntitlementActive(body.subscriber, Date.now());
}

export const setPremiumFromRevenueCat = internalMutation({
  args: { clerkId: v.string(), isPremium: v.boolean() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .first();
    if (!user) return;
    // Skip no-ops, so a repeat event doesn't reset purchasedAt or restart a
    // partner's grace period.
    if ((user.isPremium === true) === args.isPremium) return;
    await applyPremiumChange(ctx, user, args.isPremium);
  },
});

/**
 * Called by the app after a purchase or restore. It checks with RevenueCat
 * instead of trusting the client, then returns the result.
 */
export const syncPremium = action({
  args: {},
  handler: async (ctx): Promise<boolean> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    const isPremium = await hasPremium(identity.subject);
    await ctx.runMutation(internal.revenuecat.setPremiumFromRevenueCat, {
      clerkId: identity.subject,
      isPremium,
    });
    return isPremium;
  },
});

/**
 * RevenueCat's webhook (Project settings > Integrations > Webhooks), sent with
 * the Authorization header set to REVENUECAT_WEBHOOK_AUTH. Catches what the app
 * never sees: refunds, expiries, and purchases moved between accounts.
 */
export const webhook = httpAction(async (ctx, request) => {
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
  if (!expected || request.headers.get('Authorization') !== expected) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { event } = (await request.json()) as { event?: WebhookEvent };
  // The dashboard's "Send test event" uses a made-up purchaser.
  if (!event || event.type === 'TEST') return new Response(null, { status: 200 });

  for (const clerkId of appUserIdsFromEvent(event)) {
    await ctx.runMutation(internal.revenuecat.setPremiumFromRevenueCat, {
      clerkId,
      isPremium: await hasPremium(clerkId),
    });
  }
  // Any error above returns a 500, and RevenueCat retries.
  return new Response(null, { status: 200 });
});
