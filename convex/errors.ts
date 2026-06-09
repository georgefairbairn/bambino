import { ConvexError } from 'convex/values';

/**
 * Canonical set of structured error codes thrown by Convex mutations.
 *
 * The mobile client switches on these via `decodeConvexError`
 * (`lib/convex-errors.ts`) to show specific, actionable messages instead of a
 * generic "please try again". Plain `throw new Error('...')` is redacted to
 * "Server Error" in production by Convex — only `ConvexError` data survives the
 * wire, which is why every user-facing mutation failure goes through here.
 *
 * NOTE: returned-object discriminants (e.g. `NAME_NOT_CONFIRMED`,
 * `FREE_TIER_PARTNER_LIMIT`, `PARTNER_HAS_PENDING_PROPOSAL`) are a separate,
 * intentional pattern — they are *values returned* from mutations, not thrown
 * errors, so they are NOT part of this union.
 */
export type ConvexErrorCode =
  // Shared / auth
  | 'UNAUTHENTICATED'
  | 'USER_NOT_FOUND'
  // partners.ts
  | 'SHARE_CODE_GENERATION_FAILED'
  | 'INVALID_SHARE_CODE'
  | 'CODE_NOT_FOUND'
  | 'CANNOT_LINK_SELF'
  | 'PARTNER_ALREADY_LINKED'
  | 'TARGET_ALREADY_HAS_PARTNER'
  | 'NO_PARTNER_LINKED'
  | 'RATE_LIMITED'
  // matches.ts
  | 'MATCH_NOT_FOUND'
  | 'NOT_AUTHORIZED'
  | 'MATCH_FROM_PREVIOUS_PARTNERSHIP'
  | 'NOTES_TOO_LONG'
  | 'MESSAGE_TOO_LONG'
  | 'NO_PENDING_PROPOSAL'
  | 'CANNOT_RESPOND_OWN_PROPOSAL'
  | 'NOT_PROPOSER'
  | 'PROPOSAL_NOT_PENDING'
  // selections.ts
  | 'SELECTION_NOT_FOUND'
  | 'BULK_LIMIT_EXCEEDED'
  // feedback.ts (also reuses UNAUTHENTICATED, USER_NOT_FOUND, RATE_LIMITED,
  // MESSAGE_TOO_LONG, NOTES_TOO_LONG, MATCH_NOT_FOUND, NOT_AUTHORIZED above)
  | 'MESSAGE_EMPTY';

export interface ConvexErrorData {
  code: ConvexErrorCode;
  message: string;
  /** Optional structured extras (e.g. RATE_LIMITED carries `retryAfterMs`). */
  [key: string]: unknown;
}

/**
 * Build a `ConvexError` with a structured `{ code, message }` payload that the
 * client can decode. `extra` adds machine-readable fields alongside the
 * human-readable message (e.g. `{ retryAfterMs }`).
 */
export function convexError(code: ConvexErrorCode, message: string, extra?: Record<string, unknown>) {
  return new ConvexError({ code, message, ...extra });
}
