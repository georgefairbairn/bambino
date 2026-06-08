# Bambino

An [Expo](https://expo.dev) React Native app for baby-name discovery. Partners swipe on names Tinder-style — like, reject, or skip — and when both partners like the same name it becomes a **match**. Likes, matches, and partner sync are backed by [Convex](https://convex.dev) in real time.

Each user has a single global list of liked/rejected names (filtered by gender/origin) and links to a partner at the account level via a share code.

> This README is the practical getting-started reference. For the full architecture breakdown, see [`CLAUDE.md`](./CLAUDE.md).

## Tech stack

- **Expo SDK** `~54.0.34` / **React Native** `0.81.5` / **React** `19.1.0` (new architecture enabled)
- **expo-router** `~6.0.23` — file-based, typed routes
- **Convex** `~1.39.1` — backend: database, server functions, real-time sync
- **Clerk** (`@clerk/clerk-expo` `^2.19.37`) — auth: email/password + Google SSO + Apple SSO
- **NativeWind** `^4.2.4` — Tailwind CSS via `className`
- **reanimated** `~4.1.1` + **gesture-handler** `~2.31.2` — swipe card animations
- **RevenueCat** (`react-native-purchases` `^9.12.0`) — premium / in-app purchases
- **PostHog** `~4.45.16` (analytics) + **Sentry** `~7.13.0` (error tracking) — production only
- **expo-speech** `~14.0.8` — voice/TTS name pronunciation; **gifted-charts** + **svg** — popularity charts

## Getting started

The app needs **two processes running together**: the Convex dev server and the Expo dev server.

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment** — copy the template and fill in your keys:

   ```bash
   cp .env.example .env
   ```

   Clerk and Convex keys are required to boot; RevenueCat / PostHog / Sentry are optional in dev (analytics and error tracking are disabled when `__DEV__`). See [Environment variables](#environment-variables).

3. **Set the Convex JWT issuer** (one-time, in the Convex dashboard or CLI):

   ```bash
   npx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-clerk-issuer
   ```

4. **Run both servers** (separate terminals):

   ```bash
   npx convex dev        # backend — keep running
   npm run ios           # or `npm start`, then choose a target
   ```

This is an iOS-focused app and uses a dev build (not Expo Go), so `npm run ios` / `npm run android` build a native dev client.

## Environment variables

App-side vars live in `.env` (all prefixed `EXPO_PUBLIC_`, from `.env.example`). Never commit real values.

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk authentication (required) |
| `EXPO_PUBLIC_CONVEX_URL` | Convex backend URL (required) |
| `EXPO_PUBLIC_REVENUECAT_API_KEY` | RevenueCat in-app purchases |
| `EXPO_PUBLIC_POSTHOG_API_KEY` | PostHog analytics (prod) |
| `EXPO_PUBLIC_POSTHOG_HOST` | PostHog host (e.g. `https://us.i.posthog.com`) |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry error tracking (prod) |

Backend-side, set in the Convex dashboard:

| Variable | Purpose |
| --- | --- |
| `CLERK_JWT_ISSUER_DOMAIN` | Validates Clerk JWTs passed to Convex |

`APP_ENV` (`development` | `production`) in `app.config.ts` gates Sentry/PostHog and the push/`aps-environment` configuration.

## Scripts

| Script | What it does |
| --- | --- |
| `npm start` | Start the Expo dev server |
| `npm run ios` | Build & run on iOS (dev client) |
| `npm run android` | Build & run on Android (dev client) |
| `npm run lint` | ESLint (with Prettier) |

Data scripts (see [Data pipeline](#data-pipeline)):

| Script | What it does |
| --- | --- |
| `npm run process:ssa` | Process raw SSA data files |
| `npm run extract-names` | Extract candidate names from SSA data |
| `npm run enrich-names` | Enrich names via Claude API (needs `ANTHROPIC_API_KEY`) |
| `npm run seed:names` | Seed names into Convex |
| `npm run seed:popularity` | Seed historical popularity data |
| `npm run update:ranks` | Recompute current ranks |
| `npm run backfill:ranks` | Backfill ranks on existing names |
| `npm run backfill:tiers` | Backfill popularity tiers |
| `npm run populate:origin-stats` | Precompute (origin, gender) name counts |
| `npm run backfill:selection-origin-gender` | Backfill origin/gender on selections |
| `npm run update:name-origin` | Update name origins |

## Architecture

File-based routing under `app/` (`(auth)` for sign-in/up, `(tabs)` for the main app: dashboard, matches, profile, explore). UI lives in `components/`, the Convex backend in `convex/`, React context providers in `contexts/`, custom hooks in `hooks/`, theme/swipe/origin config in `constants/`, shared utilities in `lib/`, and data-processing scripts in `scripts/`.

Provider stack (`app/_layout.tsx` → `AuthGate`):

```
GestureHandlerRootView
└─ ErrorBoundary (bare fallback)
   └─ ClerkProvider
      └─ ThemeProvider
         └─ ErrorBoundary (themed)
            └─ AuthGate
               └─ ConvexProviderWithClerk (keyed on Clerk user.id)
                  └─ SkinToneProvider
                     └─ VoiceSettingsProvider
                        └─ OnboardingProvider
                           └─ Slot (+ OfflineBanner)
```

The Convex provider and user-scoped contexts are keyed on `user.id` so signing out and back in resets in-memory state (no flash of the previous user's data). **See [`CLAUDE.md`](./CLAUDE.md) for the full breakdown.**

## Convex schema / data model

Source of truth: [`convex/schema.ts`](./convex/schema.ts).

| Table | Purpose |
| --- | --- |
| `users` | Clerk-synced accounts; filters (`genderFilter`/`originFilter`), swipe counters, `shareCode`/`partnerId`, premium and push fields |
| `names` | Baby-name catalog: gender, origin, meaning, current rank, popularity tier, sort keys |
| `namePopularity` | Historical SSA rank/count by name + gender + year |
| `selections` | Per-user swipe decisions (like / reject / skip) |
| `matches` | Mutual likes, stored with canonical `user1Id < user2Id` ordering; proposal & favorite state |
| `nameOriginStats` | Precomputed (origin, gender) name counts |
| `shareCodeAttempts` | Rate limiting for partner-link attempts |
| `feedbackRateLimits` | Throttle for in-app feedback submissions |

**Model:** one global liked/rejected list per user plus gender/origin filters. Partners link at the account level via an 8-character share code (confusable characters removed). Match detection checks a partner's likes against the current user's via an index over `selections`.

## Data pipeline

Baby-name data originates from the US SSA dataset and is processed into Convex in order:

1. `npm run process:ssa` — process the raw SSA files
2. `npm run extract-names` — extract candidate names
3. `npm run enrich-names` — enrich (meaning, origin, etc.) via the Claude API (`ANTHROPIC_API_KEY` required)
4. `npm run seed:names` — load names into Convex
5. `npm run seed:popularity` — load historical popularity
6. Maintenance as needed: `update:ranks`, `backfill:ranks`, `backfill:tiers`, `populate:origin-stats`

## Features

- **Swipe loop** — like / reject / skip, filtered by gender and origin
- **Matches** — partner's mutual like creates a match in real time
- **Partner linking** — connect at the account level via share code
- **Match proposals & favorites** — propose a chosen name, mark favorites, add notes
- **Premium (RevenueCat)** — unlimited swipes and partner linking; premium propagates to a linked partner
- **Popularity** — historical SSA rank charts and sparklines per name
- **Themes** — candy themes (pink/mint/blue/yellow)
- **Voice/TTS** — name pronunciation via expo-speech
- **Skin tone** — selectable emoji skin tone
- **Push notifications** — match alerts (premium, partner-centered)
- **Onboarding** — first-run flow, completion stored per account
- **In-app feedback** — bug/feature/general submissions

## Deployment (EAS)

- Build & submit with [EAS](https://docs.expo.dev/eas/) (`eas build` / `eas submit`); the EAS project id is in `app.config.ts`.
- `APP_ENV=production` flips Sentry/PostHog and the push environment to prod.
- Bundle id / package: `xyz.bambinobaby.app` (iOS and Android).
- Deploy the Convex backend to production with `npx convex deploy`.

## More

- [`CLAUDE.md`](./CLAUDE.md) — full architecture and conventions
- [`PLAN.md`](./PLAN.md) — development roadmap and task status
