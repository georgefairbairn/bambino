import * as AuthSession from 'expo-auth-session';

/**
 * Explicit redirect URL for Clerk's OAuth (Google) SSO flow — resolves to
 * `bambino://sso-callback` in dev-client / standalone builds.
 *
 * ⚠️ This value MUST be listed in the Clerk Dashboard under
 * Native applications → Allowed redirect URLs. If SSO starts failing with a
 * (misleading) "redirect url mismatch" error after rotating Clerk apps or
 * migrating instances, a missing entry here is the first thing to check.
 * See docs/clerk-setup.md.
 *
 * Passing it explicitly to `startSSOFlow` (rather than relying on Clerk's
 * internal default) keeps the value grep-able and pinned to the dashboard
 * allowlist.
 */
export const SSO_REDIRECT_URL = AuthSession.makeRedirectUri({
  scheme: 'bambino',
  path: 'sso-callback',
});
