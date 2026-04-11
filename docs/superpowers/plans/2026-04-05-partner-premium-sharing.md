# Partner Premium Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When one partner has premium, the other gets the full premium experience — unlimited swipes, matches access, all filters — with a 24-hour grace period on unlink and "Premium via [Partner]" transparency.

**Architecture:** A new `convex/premium.ts` file provides a `getEffectivePremiumStatus` helper that checks own premium, partner premium, and grace period. A dedicated Convex query exposes this to the frontend via a `useEffectivePremium()` hook. All existing `isPremium` checks (backend and frontend) migrate to use these new primitives.

**Tech Stack:** Convex (backend queries/mutations), React Native hooks, TypeScript

---

### Task 1: Add `premiumRevokedAt` to Schema

**Files:**
- Modify: `convex/schema.ts:6-19`

- [ ] **Step 1: Add the field to the users table**

In `convex/schema.ts`, add `premiumRevokedAt` to the users table definition, after the `purchasedAt` field:

```ts
isPremium: v.optional(v.boolean()),
purchasedAt: v.optional(v.number()),
premiumRevokedAt: v.optional(v.number()),
```

- [ ] **Step 2: Verify Convex accepts the schema**

Run: `npx convex dev --once`
Expected: Schema pushes successfully with no errors.

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat: add premiumRevokedAt field to users schema"
```

---

### Task 2: Create `convex/premium.ts` — Helper + Query

**Files:**
- Create: `convex/premium.ts`

- [ ] **Step 1: Create the premium helper and query**

Create `convex/premium.ts` with the following content:

```ts
import { query, QueryCtx, MutationCtx } from './_generated/server';
import { Id } from './_generated/dataModel';

const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000; // 24 hours

export type EffectivePremiumStatus = {
  isPremium: boolean;
  isOwnPremium: boolean;
  isPartnerPremium: boolean;
  partnerName?: string;
  gracePeriodEndsAt?: number;
};

export async function getEffectivePremiumStatusHelper(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>,
): Promise<EffectivePremiumStatus> {
  const user = await ctx.db.get(userId);
  if (!user) {
    return { isPremium: false, isOwnPremium: false, isPartnerPremium: false };
  }

  // 1. Own premium
  if (user.isPremium === true) {
    return { isPremium: true, isOwnPremium: true, isPartnerPremium: false };
  }

  // 2. Partner premium
  if (user.partnerId) {
    const partner = await ctx.db.get(user.partnerId);
    if (partner?.isPremium === true) {
      return {
        isPremium: true,
        isOwnPremium: false,
        isPartnerPremium: true,
        partnerName: partner.name,
      };
    }
  }

  // 3. Grace period
  if (user.premiumRevokedAt) {
    const gracePeriodEndsAt = user.premiumRevokedAt + GRACE_PERIOD_MS;
    if (Date.now() < gracePeriodEndsAt) {
      return {
        isPremium: true,
        isOwnPremium: false,
        isPartnerPremium: false,
        gracePeriodEndsAt,
      };
    }
  }

  // 4. Not premium
  return { isPremium: false, isOwnPremium: false, isPartnerPremium: false };
}

export const getEffectivePremiumStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { isPremium: false, isOwnPremium: false, isPartnerPremium: false };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique();

    if (!user) {
      return { isPremium: false, isOwnPremium: false, isPartnerPremium: false };
    }

    return getEffectivePremiumStatusHelper(ctx, user._id);
  },
});
```

- [ ] **Step 2: Verify it compiles**

Run: `npx convex dev --once`
Expected: Pushes successfully, `premium.getEffectivePremiumStatus` is available.

- [ ] **Step 3: Commit**

```bash
git add convex/premium.ts
git commit -m "feat: add effective premium helper and query"
```

---

### Task 3: Update `unlinkPartner` to Set Grace Period

**Files:**
- Modify: `convex/partners.ts:191-217`

- [ ] **Step 1: Update the unlinkPartner mutation**

In `convex/partners.ts`, replace the `unlinkPartner` mutation handler with grace period logic. After the line `const partner = await ctx.db.get(user.partnerId);`, add the grace period logic before clearing `partnerId`:

```ts
export const unlinkPartner = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);

    if (!user.partnerId) {
      throw new Error('No partner linked');
    }

    const partner = await ctx.db.get(user.partnerId);
    const now = Date.now();

    // Set grace period on the non-premium user
    if (partner) {
      const userIsPremium = user.isPremium === true;
      const partnerIsPremium = partner.isPremium === true;

      if (userIsPremium && !partnerIsPremium) {
        await ctx.db.patch(partner._id, { premiumRevokedAt: now });
      } else if (partnerIsPremium && !userIsPremium) {
        await ctx.db.patch(user._id, { premiumRevokedAt: now });
      }
    }

    await ctx.db.patch(user._id, {
      partnerId: undefined,
      updatedAt: now,
    });

    if (partner) {
      await ctx.db.patch(partner._id, {
        partnerId: undefined,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});
```

- [ ] **Step 2: Verify it compiles**

Run: `npx convex dev --once`
Expected: Pushes successfully.

- [ ] **Step 3: Commit**

```bash
git add convex/partners.ts
git commit -m "feat: set premiumRevokedAt on non-premium user during unlink"
```

---

### Task 4: Update `linkPartner` to Clear Grace Period

**Files:**
- Modify: `convex/partners.ts:128-189`

- [ ] **Step 1: Add premiumRevokedAt clearing after linking**

In `convex/partners.ts`, in the `linkPartner` mutation, after the two `ctx.db.patch` calls that set `partnerId`, add grace period clearing:

```ts
    // Link bidirectionally
    await ctx.db.patch(user._id, {
      partnerId: targetUser._id,
      updatedAt: now,
    });

    await ctx.db.patch(targetUser._id, {
      partnerId: user._id,
      updatedAt: now,
    });

    // Clear grace period if linking to a premium partner
    if (targetIsPremium && user.premiumRevokedAt) {
      await ctx.db.patch(user._id, { premiumRevokedAt: undefined });
    }
    if (userIsPremium && targetUser.premiumRevokedAt) {
      await ctx.db.patch(targetUser._id, { premiumRevokedAt: undefined });
    }

    return { success: true };
```

Note: `userIsPremium` and `targetIsPremium` are already defined earlier in the handler.

- [ ] **Step 2: Verify it compiles**

Run: `npx convex dev --once`
Expected: Pushes successfully.

- [ ] **Step 3: Commit**

```bash
git add convex/partners.ts
git commit -m "feat: clear premiumRevokedAt when linking to premium partner"
```

---

### Task 5: Update `updatePremiumStatus` to Handle Grace Period

**Files:**
- Modify: `convex/users.ts:86-101`

- [ ] **Step 1: Update the mutation to clear/set grace period**

Replace the `updatePremiumStatus` mutation in `convex/users.ts`:

```ts
export const updatePremiumStatus = mutation({
  args: {
    isPremium: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);

    const updates: {
      isPremium: boolean;
      purchasedAt?: number;
      premiumRevokedAt?: number;
      updatedAt: number;
    } = {
      isPremium: args.isPremium,
      updatedAt: Date.now(),
    };

    if (args.isPremium) {
      updates.purchasedAt = Date.now();
      // Clear own grace period since user now has their own premium
      if (user.premiumRevokedAt) {
        updates.premiumRevokedAt = undefined;
      }
    } else {
      updates.purchasedAt = undefined;
      // If losing premium and has a non-premium partner, set grace period on partner
      if (user.partnerId) {
        const partner = await ctx.db.get(user.partnerId);
        if (partner && partner.isPremium !== true) {
          await ctx.db.patch(partner._id, {
            premiumRevokedAt: Date.now(),
          });
        }
      }
    }

    await ctx.db.patch(user._id, updates);

    return { success: true };
  },
});
```

- [ ] **Step 2: Verify it compiles**

Run: `npx convex dev --once`
Expected: Pushes successfully.

- [ ] **Step 3: Commit**

```bash
git add convex/users.ts
git commit -m "feat: handle premiumRevokedAt in updatePremiumStatus"
```

---

### Task 6: Migrate Backend Swipe Limit to Use Helper

**Files:**
- Modify: `convex/selections.ts:1-4` (imports)
- Modify: `convex/selections.ts:80-98` (recordSelection premium check)

- [ ] **Step 1: Import the helper**

Add at the top of `convex/selections.ts`, after the existing imports:

```ts
import { getEffectivePremiumStatusHelper } from './premium';
```

- [ ] **Step 2: Replace the isPremium check in recordSelection**

In `convex/selections.ts`, replace the swipe limit check block (lines 89-98):

```ts
    // Free tier: limit to 25 swipes total
    if (!user.isPremium) {
      const allSelections = await ctx.db
        .query('selections')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .collect();

      if (allSelections.length >= 25) {
        return { error: 'FREE_TIER_SWIPE_LIMIT' as const };
      }
    }
```

With:

```ts
    // Free tier: limit to 25 swipes total (check effective premium including partner sharing)
    const premiumStatus = await getEffectivePremiumStatusHelper(ctx, user._id);
    if (!premiumStatus.isPremium) {
      const allSelections = await ctx.db
        .query('selections')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .collect();

      if (allSelections.length >= 25) {
        return { error: 'FREE_TIER_SWIPE_LIMIT' as const };
      }
    }
```

- [ ] **Step 3: Verify it compiles**

Run: `npx convex dev --once`
Expected: Pushes successfully.

- [ ] **Step 4: Commit**

```bash
git add convex/selections.ts
git commit -m "feat: use effective premium helper for swipe limit check"
```

---

### Task 7: Create `useEffectivePremium` Hook

**Files:**
- Create: `hooks/use-effective-premium.ts`

- [ ] **Step 1: Create the hook**

Create `hooks/use-effective-premium.ts`:

```ts
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export function useEffectivePremium() {
  const status = useQuery(api.premium.getEffectivePremiumStatus);

  return {
    isPremium: status?.isPremium ?? false,
    isOwnPremium: status?.isOwnPremium ?? false,
    isPartnerPremium: status?.isPartnerPremium ?? false,
    partnerName: status?.partnerName,
    gracePeriodEndsAt: status?.gracePeriodEndsAt,
    isLoading: status === undefined,
  };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx expo export --platform ios --no-minify 2>&1 | head -20` or simply check TypeScript:
Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No type errors related to the new hook.

- [ ] **Step 3: Commit**

```bash
git add hooks/use-effective-premium.ts
git commit -m "feat: add useEffectivePremium hook"
```

---

### Task 8: Migrate Matches Tab to `useEffectivePremium`

**Files:**
- Modify: `app/(tabs)/matches.tsx:12-13` (imports)
- Modify: `app/(tabs)/matches.tsx:48` (hook call)

- [ ] **Step 1: Replace the import and hook usage**

In `app/(tabs)/matches.tsx`:

1. Replace the import:
```ts
// Remove:
import { usePurchases } from '@/hooks/use-purchases';

// Add:
import { useEffectivePremium } from '@/hooks/use-effective-premium';
import { usePurchases } from '@/hooks/use-purchases';
```

Keep `usePurchases` imported because `restorePurchases` is used in the empty state CTA.

2. Replace the hook call at line 48:
```ts
// Remove:
const { isPremium, restorePurchases } = usePurchases();

// Replace with:
const { isPremium } = useEffectivePremium();
const { restorePurchases } = usePurchases();
```

All other code in the file stays the same — the `isPremium` variable is now sourced from effective premium.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/matches.tsx
git commit -m "feat: use effective premium in matches tab"
```

---

### Task 9: Migrate Profile Tab to `useEffectivePremium`

**Files:**
- Modify: `app/(tabs)/profile.tsx:24` (imports)
- Modify: `app/(tabs)/profile.tsx:78` (hook call)
- Modify: `app/(tabs)/profile.tsx:291-317` (premium banner/active section)

- [ ] **Step 1: Add the import**

In `app/(tabs)/profile.tsx`, add:
```ts
import { useEffectivePremium } from '@/hooks/use-effective-premium';
```

Keep the existing `usePurchases` import since the Paywall component still needs it internally.

- [ ] **Step 2: Replace the isPremium source in the component**

In the `Profile` component, replace:
```ts
const { isPremium } = usePurchases();
```

With:
```ts
const { isPremium, isOwnPremium, isPartnerPremium, partnerName: premiumPartnerName } = useEffectivePremium();
```

Remove `usePurchases` from the imports since it's no longer used directly in profile.tsx (the Paywall component uses it internally).

- [ ] **Step 3: Update the Premium Active section to show partner sharing**

Replace the "Premium Active" block (lines 305-317):

```ts
        {/* Premium Active */}
        {isPremium && (
          <Animated.View
            entering={FadeInUp.delay(100).duration(400).springify()}
            style={styles.premiumSection}
          >
            <View style={[styles.premiumActiveRow, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="star" size={18} color={colors.primary} />
              <Text style={[styles.premiumActiveText, { color: colors.primary }]}>
                Premium Active
              </Text>
            </View>
          </Animated.View>
        )}
```

With:

```ts
        {/* Premium Active */}
        {isPremium && (
          <Animated.View
            entering={FadeInUp.delay(100).duration(400).springify()}
            style={styles.premiumSection}
          >
            <View style={[styles.premiumActiveRow, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="star" size={18} color={colors.primary} />
              <Text style={[styles.premiumActiveText, { color: colors.primary }]}>
                {isPartnerPremium && !isOwnPremium
                  ? `Premium via ${premiumPartnerName || 'Partner'}`
                  : 'Premium Active'}
              </Text>
            </View>
          </Animated.View>
        )}
```

- [ ] **Step 4: Update the premium banner condition**

The `!isPremium` check for showing the "Go Premium" banner (line 291) already works correctly — when `isPartnerPremium` is true, `isPremium` will be true and the banner will be hidden. No change needed here.

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No type errors.

- [ ] **Step 6: Commit**

```bash
git add app/(tabs)/profile.tsx
git commit -m "feat: use effective premium in profile with partner attribution"
```

---

### Task 10: Verify End-to-End Behavior

**Files:** None (manual testing)

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: No new errors.

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Push Convex schema and functions**

Run: `npx convex dev --once`
Expected: All functions deploy successfully.

- [ ] **Step 4: Manual testing checklist**

Test these scenarios in the app:

1. **Free user, no partner:** Matches tab shows "Match With Your Partner" empty state. Swipe limit at 25.
2. **Premium user, no partner:** Matches tab shows "Invite Your Partner" empty state. Unlimited swipes.
3. **Premium user A linked to free user B:** Both users see matches. User B has unlimited swipes. User B's profile shows "Premium via [User A's name]".
4. **User A unlinks from premium User B:** User A (free) still has premium for 24 hours. Grace period active.
5. **Free user purchases premium during grace period:** `premiumRevokedAt` cleared, shows "Premium Active" (not "via Partner").
6. **Free user re-links with premium partner during grace period:** `premiumRevokedAt` cleared.

- [ ] **Step 5: Commit any fixes**

If any issues found during testing, fix and commit individually.
