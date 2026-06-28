import * as Sentry from '@sentry/react-native';

/** A single entry in a Clerk API error response (`err.errors[]`). */
interface ClerkAPIError {
  code?: string;
  message?: string;
  longMessage?: string;
}

interface ClerkErrorLike {
  errors?: ClerkAPIError[];
}

/**
 * Clerk error `code`s that represent expected user-input validation failures —
 * the user already sees a friendly message for these, so they're noise in
 * Sentry, not bugs to monitor.
 *
 * Keyed on Clerk's stable `code` rather than the (localizable, reworded)
 * message text. Deliberately omits `form_param_unknown` — that's the
 * `first_name is not a valid parameter` SSO/config error (BAMBINO-2), a real
 * problem we want to stay visible until the Clerk dashboard is fixed.
 */
const EXPECTED_CLERK_ERROR_CODES = new Set<string>([
  'form_identifier_not_found', // "Couldn't find your account."
  'form_password_incorrect', // wrong password
  'form_password_pwned', // breached password rejected at sign-up
  'form_identifier_exists', // email already registered (sign-up)
  'form_code_incorrect', // wrong email verification / reset code
  'verification_failed', // bad/too-many verification attempts
  'verification_expired', // code expired
  'form_param_format_invalid', // malformed email/identifier
  'form_param_nil', // required field left empty, e.g. "Enter password." (BAMBINO-2)
  'form_param_missing', // required field absent from the request
  'authorization_invalid', // "You are not authorized to perform this request"
  'session_exists', // already signed in
]);

function firstClerkError(err: unknown): ClerkAPIError | undefined {
  return (err as ClerkErrorLike)?.errors?.[0];
}

/**
 * Extract a clean, user-presentable message from an unknown Clerk error,
 * falling back to `fallback` when the shape isn't recognized.
 */
export function getClerkErrorMessage(err: unknown, fallback: string): string {
  const clerkError = firstClerkError(err);
  return clerkError?.message || clerkError?.longMessage || fallback;
}

/**
 * True when the error is an expected user-input validation failure (see
 * `EXPECTED_CLERK_ERROR_CODES`) — i.e. UX feedback, not something to report.
 */
export function isExpectedClerkError(err: unknown): boolean {
  const code = firstClerkError(err)?.code;
  return code ? EXPECTED_CLERK_ERROR_CODES.has(code) : false;
}

/**
 * Report a Clerk error to Sentry, but only when it's genuinely unexpected.
 * Expected validation failures (wrong/unknown email, bad code, etc.) are
 * dropped so they stop polluting the error stream (BAMBINO-2).
 */
export function reportClerkError(err: unknown, tags: Record<string, string>): void {
  if (isExpectedClerkError(err)) return;
  Sentry.captureException(err, { tags });
}
