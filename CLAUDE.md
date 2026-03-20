# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start                # Start Expo dev server
npm run ios              # Start on iOS simulator
npm run android          # Start on Android emulator
npm run web              # Start web version
npm run lint             # Run ESLint with Prettier
npx convex dev           # Start Convex backend dev server (must run alongside Expo)
npm run seed:names       # Seed baby names into Convex
npm run seed:popularity  # Seed historical popularity data
npm run process:ssa      # Process raw SSA data files
```

## Architecture

**Bambino** is an Expo React Native app for baby name discovery. Partners swipe on names (Tinder-style), and mutual likes become matches.

### Tech Stack

- **Expo SDK 54** with React Native 0.81 (new architecture enabled)
- **Convex** - Backend (database, server functions, real-time sync)
- **Clerk** - Authentication (email/password + Google SSO)
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
    profile.tsx            # User settings and account
    explore/               # Search management + swipe interface
      index.tsx            # Search list
      new.tsx              # Create new search
      [id]/index.tsx       # Swipe card interface
      [id]/edit.tsx        # Edit search filters
components/                # UI components organized by feature
  swipe/                   # Card stack, swipe buttons, search header
  dashboard/               # Liked/rejected name cards, headers
  matches/                 # Match cards, celebration modal
  name-detail/             # Name detail modal, gender badge
  search/                  # Gender filter, origin picker, join modal
  popularity/              # Charts, sparklines, rank badges
  onboarding/              # First-time user screens
  settings/                # Voice settings
contexts/
  search-context.tsx       # Active search ID (persisted to AsyncStorage)
  voice-settings-context.tsx  # TTS voice preference (persisted to AsyncStorage)
convex/
  schema.ts                # Database schema (7 tables)
  auth.config.ts           # Clerk JWT configuration
  users.ts                 # User sync with Clerk
  searches.ts              # Search CRUD + share codes
  selections.ts            # Swipe decisions + queue management
  matches.ts               # Mutual match detection
  names.ts                 # Name lookup + seeding
  popularity.ts            # Historical popularity queries
constants/
  theme.ts                 # Colors (light/dark) and platform-specific fonts
  swipe.ts                 # Card dimensions, gesture thresholds, animation config
hooks/                     # useActiveSearch, useStoreUser, useCardAnimation, useSwipeGesture, useOnboarding
scripts/                   # Data processing and seeding (seed-names, seed-popularity, process-ssa-data)
```

### Provider Stack (root layout)

```
GestureHandlerRootView
  ErrorBoundary
    ClerkProvider
      ClerkLoaded
        ConvexProviderWithClerk
          VoiceSettingsProvider
            SearchProvider
              Slot (expo-router)
```

### Convex Backend

**Schema tables:** `users`, `names`, `namePopularity`, `searches`, `searchMembers`, `selections`, `matches`

**Data fetching pattern:** Use `useQuery` and `useMutation` from `convex/react` with function references from `@/convex/_generated/api`:

```ts
const searches = useQuery(api.searches.getUserSearches);
const createSearch = useMutation(api.searches.createSearch);
```

Auth is handled via Clerk JWT tokens passed to Convex automatically by `ConvexProviderWithClerk`. Server functions access the authenticated user via `ctx.auth.getUserIdentity()`.

### State Management

- **Convex** - All persistent data (names, searches, selections, matches)
- **AsyncStorage** - Local preferences (active search ID, voice settings)
- **React Context** - `SearchContext` (active search), `VoiceSettingsContext` (TTS voice)

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
