# Clerk dashboard checklist

Bambino's auth (email/password + Google SSO + Apple SSO) depends on a few
settings that live in the **Clerk Dashboard**, not in this repo. They're easy to
forget when rotating Clerk apps or migrating instances — and the resulting
errors are misleading. Run through this when setting up a new Clerk instance.

## Native applications → Allowed redirect URLs

Must include:

```
bambino://sso-callback
```

This is the value passed as `redirectUrl` to `startSSOFlow` (see
`lib/sso.ts` → `SSO_REDIRECT_URL`, consumed in `app/(auth)/sign-in.tsx` and
`app/(auth)/sign-up.tsx`).

**Symptom if missing:** Google SSO fails with a **"redirect url mismatch"**
error — misleading, because the code is correct; the dashboard allowlist is the
problem.

## Google OAuth

- A Google OAuth client must be configured for the Clerk instance (SSO
  connection enabled for Google).
- Until Google's consent screen is verified, Google caps the project at 100
  logins — submit for verification before promoting to the App Store.

## Apple SSO

- Apple Services ID configured (Sign in with Apple connection enabled).
- The app ships the `com.apple.developer.applesignin` entitlement and the
  `expo-apple-authentication` plugin (see `app.config.ts`).

## JWT (Convex)

- `CLERK_JWT_ISSUER_DOMAIN` is set in the Convex dashboard for JWT validation
  (see `convex/auth.config.ts`).
