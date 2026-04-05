# Partner Matching Premium Redesign

## Overview

Rethink the partner linking feature as a clearly gated premium experience. Free users should understand matching is premium before they try to use it. Premium users must confirm their profile (name + photo) before sharing their code or linking. The Matches tab gets three distinct empty states based on user status.

## Schema Changes

### Users Table

Add one field:

- `nameConfirmed: v.optional(v.boolean())` — `undefined`/`false` until the user explicitly confirms their profile via the Name Confirmation Modal. Once `true`, share/link actions proceed without interruption.

No new indexes needed.

## Backend Changes

### `convex/users.ts`

New mutation `confirmName`:
- Args: `firstName: string`, `lastName: string`
- Sets `name` field to `"firstName lastName"` (trimmed)
- Sets `nameConfirmed: true`
- Returns the updated user

The client also updates Clerk via `user.update({ firstName, lastName })` before calling this mutation, so both systems stay in sync.

### `convex/partners.ts`

Update `linkPartner` mutation:
- After existing validation, add check: if calling user has `nameConfirmed !== true`, return error code `NAME_NOT_CONFIRMED`
- This is a server-side safety net — the client gates this earlier, but the server enforces it

No changes to `getUserByShareCode`, `getPartnerInfo`, `unlinkPartner`, or `generateUniqueShareCode`.

## New Component: Name Confirmation Modal

**File:** `components/partner/name-confirmation-modal.tsx`

**Presentation:** `AnimatedBottomSheet` (consistent with existing modals)

**Content (top to bottom):**
1. Tappable avatar with camera badge — shows current Clerk profile image, or gradient placeholder with initial. Tapping opens image picker (reuses `pickAndUploadImage` logic from `profile.tsx`)
2. "Tap to add a photo" hint (only if no photo set)
3. Title: "Confirm Your Profile"
4. Subtitle: "This is how your partner will see you"
5. First Name field — pre-populated from Clerk `user.firstName`
6. Last Name field — pre-populated from Clerk `user.lastName`
7. "Looks Good!" primary gradient button
8. "You can change these later in your profile" info text

**Behavior:**
- On confirm: updates Clerk name via client SDK, calls `confirmName` Convex mutation, fires `onConfirmed` callback
- `onConfirmed` callback re-triggers the original action (copy/share/open link modal) so the user doesn't have to tap twice
- Only shown once per account — after `nameConfirmed` is `true`, future actions skip this modal

**Props:**
- `visible: boolean`
- `onClose: () => void`
- `onConfirmed: () => void`

## Profile Tab — Partner Section Changes

### Gate Chain

Every action button (Copy, Share, Link Partner) follows the same gate chain:

1. **Premium check** — if `!user.isPremium`, show paywall with `trigger="partner_limit"`
2. **Name confirmation check** — if premium but `!convexUser.nameConfirmed`, show Name Confirmation Modal with `onConfirmed` callback that proceeds to step 3
3. **Execute action** — copy to clipboard / open share sheet / open Partner Link Modal

### Visual Indicators for Free Users

- Copy and Share buttons show a small lock icon (or `✦` premium indicator) to signal they're gated
- "Link Partner" button text includes premium indicator
- The share code itself remains visible (teasing the feature)

## Partner Link Modal Changes

### Name Confirmation for Receiving User

After the partner preview step (step 2), before executing `linkPartner`:
- If the entering user has `nameConfirmed !== true`, show the Name Confirmation Modal
- On confirm, proceed to execute `linkPartner`
- On dismiss, stay on the preview step

This ensures both sides of a partner link have confirmed their profile.

## Matches Tab — Three Empty States

All three states retain the existing `MatchAnimation` and `BubblePillsBackground` components. Only the copy and CTAs change.

### State 1: Free User (`!isPremium`)

- Keep existing animation
- Premium badge: "✦ Premium Feature"
- Title: "Match With Your Partner"
- Description: "Upgrade to connect with your partner and discover the baby names you both love."
- Feature list: Partner matching, Unlimited swipes, All name filters
- CTA: "Upgrade to Premium" button → opens paywall
- Secondary: "Restore Purchase" text button

### State 2: Premium, No Partner (`isPremium && !hasPartner`)

- Keep existing animation
- Title: "Invite Your Partner"
- Description: "Share your partner code and start discovering the names you both love. Matches appear when you both swipe right!"
- CTA: "Share Your Code" button → navigates to Profile tab (partner section)

### State 3: Premium, Partner Linked, No Matches (`isPremium && hasPartner && matches.length === 0`)

- Current "No Matches Yet" state — unchanged

## What's NOT Changing

- Share code generation, format, or display
- Unlink partner flow
- Paywall component internals (just triggered from new locations)
- Onboarding flow
- Match detection logic
- Partner preview in link modal

## Photo Upload Reuse

The `pickAndUploadImage` logic currently lives inline in `profile.tsx`. The Name Confirmation Modal needs the same flow (image picker → 1:1 crop → EXIF strip → JPEG compress → Clerk `setProfileImage`). Extract this into a shared utility or hook so both profile and the modal can use it without duplication.
