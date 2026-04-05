# Partner Premium Sharing

## Overview

When two partners are linked, if either one has premium, the other gets the full premium experience — unlimited swipes, all filters, matches access. This removes the friction of requiring both partners to purchase separately. The free partner sees a "Premium via [Partner Name]" indicator so they understand their access is shared and dependent on the link.

A 24-hour grace period applies after unlinking from a premium partner, giving the free user time to decide whether to purchase their own premium.

## Schema Changes

### Users Table

Add one field:

- `premiumRevokedAt: v.optional(v.number())` — timestamp set when a user loses shared premium access (partner unlinks or partner loses premium). Used to compute the 24-hour grace period. Cleared when the user purchases their own premium or re-links with a premium partner.

## Backend Changes

### New File: `convex/premium.ts`

**Internal helper:** `getEffectivePremiumStatus(ctx, userId)`

Returns:
```ts
{
  isPremium: boolean;        // true if user has access through any path
  isOwnPremium: boolean;     // true if user purchased premium themselves
  isPartnerPremium: boolean; // true if access comes from linked partner
  partnerName?: string;      // partner's display name (when isPartnerPremium)
  gracePeriodEndsAt?: number; // timestamp when grace period expires (if active)
}
```

Logic (checked in order):
1. If `user.isPremium` is true → own premium, done
2. If `user.partnerId` exists and partner's `isPremium` is true → partner premium
3. If `user.premiumRevokedAt` exists and within 24 hours → grace period active
4. Otherwise → not premium

**Exported query:** `premium.getEffectivePremiumStatus` — authenticated wrapper that calls the helper for the current user.

### Mutation Updates

**`convex/partners.ts` — `unlinkPartner`:**
- Before clearing `partnerId` on both users, check if one user is premium and the other is not
- Set `premiumRevokedAt = Date.now()` on the non-premium user
- If both are premium or both are free, no `premiumRevokedAt` needed

**`convex/partners.ts` — `linkPartner`:**
- After linking, if the new partner is premium, clear `premiumRevokedAt` on the current user (and vice versa)

**`convex/users.ts` — `updatePremiumStatus`:**
- If a user purchases premium (`isPremium: true`), clear their own `premiumRevokedAt`
- If a user loses premium (`isPremium: false`) and has a linked partner who doesn't have their own premium, set `premiumRevokedAt` on the partner

### Backend Gate Migration

Every server function that currently checks `user.isPremium` directly must use the helper instead:

- **`convex/selections.ts` — `recordSelection`:** Swipe limit check uses `getEffectivePremiumStatus` instead of `user.isPremium`
- **`convex/partners.ts` — `linkPartner`:** The "at least one must be premium" check already works correctly (it checks both users), no change needed to the linking logic itself
- **`convex/searches.ts`** or any other function with premium gates: use the helper

## Frontend Changes

### New Hook: `hooks/use-effective-premium.ts`

Wraps the `premium.getEffectivePremiumStatus` Convex query:

```ts
function useEffectivePremium(): {
  isPremium: boolean;
  isOwnPremium: boolean;
  isPartnerPremium: boolean;
  partnerName?: string;
  gracePeriodEndsAt?: number;
  isLoading: boolean;
}
```

Returns `{ isPremium: false, isLoading: true, ... }` while the query is loading.

### Frontend Gate Migration

Replace `usePurchases().isPremium` with `useEffectivePremium().isPremium` in all premium gate checks:

1. **`app/(tabs)/matches.tsx`** — empty state logic. The "free user" state now correctly shows as premium when partner is premium.
2. **`app/(tabs)/dashboard.tsx`** — any premium-gated features
3. **`components/paywall.tsx`** — the "should I show the paywall?" check uses `useEffectivePremium()`. The actual purchase flow still uses `usePurchases()` for RevenueCat interaction.
4. **Explore/filters** — origin filter restrictions, if gated by premium
5. **Any other component** reading `isPremium` for access decisions

### "Premium via [Partner]" Indicator

Where premium status is displayed (profile settings area), show "Premium via [Partner Name]" when `isPartnerPremium && !isOwnPremium`. This is a simple text indicator — no new component needed.

### `usePurchases()` Remains

`usePurchases()` continues to exist for:
- Managing the RevenueCat purchase flow
- Restoring purchases
- Syncing purchase state to the backend via `updatePremiumStatus`

It is NOT used for access-control decisions anymore. All access checks go through `useEffectivePremium()`.

## Grace Period Behavior

When a free user is unlinked from a premium partner:
1. `premiumRevokedAt` is set on the free user
2. For the next 24 hours, `getEffectivePremiumStatus` returns `isPremium: true` with `gracePeriodEndsAt`
3. After 24 hours, the helper returns `isPremium: false`
4. If the user purchases premium or re-links with a premium partner during the grace period, `premiumRevokedAt` is cleared

The grace period is computed, not enforced by a background job. The helper simply checks `Date.now() - premiumRevokedAt < 24 * 60 * 60 * 1000`.

## What's NOT Changing

- RevenueCat integration and purchase flow
- Share code system
- Match detection logic
- Name confirmation gates
- Partner link/unlink UX flows (just the premium check behavior within them)
- Paywall component visual design
- Onboarding flow
