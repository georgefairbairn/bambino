# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start                # Start Expo dev server
npm run ios              # Build & run on iOS (dev client)
npm run android          # Build & run on Android (dev client)
npm run lint             # Run ESLint with Prettier
npx convex dev           # Start Convex backend dev server (must run alongside Expo)
npm run seed:names       # Seed baby names into Convex
npm run seed:popularity  # Seed historical popularity data
npm run process:ssa      # Process raw SSA data files
npm run extract-names    # Extract candidate names from SSA data files
npm run enrich-names     # Enrich extracted names via Claude API (needs ANTHROPIC_API_KEY)
```

## Architecture

**Bambino** is an Expo React Native app for baby name discovery. Partners swipe on names (Tinder-style), and mutual likes become matches.

### Tech Stack

- **Expo SDK 54** with React Native 0.81 (new architecture enabled)
- **Convex** - Backend (database, server functions, real-time sync)
- **Clerk** - Authentication (email/password + Google SSO + Apple SSO)
- **NativeWind 4** - Tailwind CSS for React Native via `className` props
- **expo-router** - File-based routing with typed routes
- **react-native-reanimated** + **react-native-gesture-handler** - Swipe card animations

### Project Structure

```
app/
  _layout.tsx              # Root layout (providers, fonts, cssInterop)
  index.tsx                # Auth redirect (signed in -> tabs, signed out -> auth)
  (auth)/                  # Auth screens (sign-in, sign-up)
  (tabs)/                  # Main app with bottom tab navigator
    dashboard.tsx          # Liked/rejected names lists
    matches.tsx            # Mutual matches with partner
    profile.tsx            # User settings, account, partner linking
    explore/               # Swipe interface
      index.tsx            # Swipe card stack
      filters.tsx          # Gender/origin filters
components/                # UI components organized by feature
  swipe/                   # Card stack, swipe buttons, header
  dashboard/               # Liked/rejected name cards, headers
  matches/                 # Match cards, proposals, celebration modal
  name-detail/             # Name detail modal, gender badge
  partner/                 # Share code, link/unlink UI
  search/                  # Gender filter, origin picker
  popularity/              # Charts, sparklines, rank badges
  onboarding/              # First-time user screens
  push/                    # Push notification priming
  settings/                # Theme picker, voice settings
  ui/                      # Shared primitives (loading screen, offline banner)
  paywall.tsx              # RevenueCat premium paywall
contexts/
  theme-context.tsx        # Candy theme (persisted to AsyncStorage)
  voice-settings-context.tsx  # TTS voice preference (persisted to AsyncStorage)
  skin-tone-context.tsx    # Emoji skin tone (persisted to AsyncStorage)
  onboarding-context.tsx   # Onboarding completion state
convex/
  schema.ts                # Database schema (8 tables)
  auth.config.ts           # Clerk JWT configuration
  users.ts                 # User sync with Clerk + filters + share codes
  selections.ts            # Swipe decisions + queue management
  matches.ts               # Mutual match detection + proposals
  partners.ts              # Partner linking via share code
  premium.ts               # RevenueCat premium status
  names.ts                 # Name lookup + seeding
  popularity.ts            # Historical popularity queries
  notifications.ts         # Push notification registration
  feedback.ts              # In-app feedback submissions
constants/
  theme.ts                 # Candy themes, colors, platform-specific fonts
  swipe.ts                 # Card dimensions, gesture thresholds, animation config
hooks/                     # useStoreUser, useCardAnimation, useSwipeGesture, useOnboarding, usePurchases, useEffectivePremium
lib/                       # Shared utilities (analytics, formatting, SSO, convex errors)
scripts/                   # Data processing and seeding (seed-names, seed-popularity, process-ssa-data)
```

### Provider Stack (root layout)

```
GestureHandlerRootView
  ErrorBoundary (bare fallback)
    ClerkProvider
      ThemeProvider
        ErrorBoundary (themed)
          AuthGate
            ConvexProviderWithClerk (keyed on Clerk user.id)
              SkinToneProvider
                VoiceSettingsProvider
                  OnboardingProvider
                    Slot (expo-router) + OfflineBanner
```

### Convex Backend

**Schema tables:** `users`, `names`, `namePopularity`, `selections`, `matches`, `nameOriginStats`, `shareCodeAttempts`, `feedbackRateLimits`

**Data model:** Each user has a single global liked/rejected list (filtered by gender/origin on the `users` record); there is no per-search model. Partners link at the account level via an 8-character share code, and mutual likes create `matches` (stored with canonical `user1Id < user2Id` ordering).

**Data fetching pattern:** Use `useQuery` and `useMutation` from `convex/react` with function references from `@/convex/_generated/api`:

```ts
const partner = useQuery(api.partners.getPartnerInfo);
const updateFilters = useMutation(api.users.updateFilters);
```

Auth is handled via Clerk JWT tokens passed to Convex automatically by `ConvexProviderWithClerk`. Server functions access the authenticated user via `ctx.auth.getUserIdentity()`.

### State Management

- **Convex** - All persistent data (names, selections, matches, partner links)
- **AsyncStorage** - Local preferences (candy theme, voice settings, skin tone)
- **React Context** - `ThemeContext`, `VoiceSettingsContext`, `SkinToneContext`, `OnboardingContext`

### Styling Pattern

NativeWind enables `className` on RN components. `cssInterop` is configured in `app/_layout.tsx` for `ExpoImage`, `Animated.Text`, and `Animated.View`.

### Path Aliases

`@/*` maps to the project root (e.g., `@/components/swipe/swipe-card`).

### Environment Variables

- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk authentication
- `EXPO_PUBLIC_CONVEX_URL` - Convex backend URL
- `CLERK_JWT_ISSUER_DOMAIN` - Set in Convex dashboard for JWT validation

## Workflow

### PR Strategy

- One PR per Notion task (1:1 mapping)

### After Merging a PR

1. Update the associated Notion task status to complete
2. Add the GitHub PR URL to the Notion task
3. Update `PLAN.md` to mark the completed task(s)

### Planning Reference

Always refer to `PLAN.md` for the current development roadmap and task status.
