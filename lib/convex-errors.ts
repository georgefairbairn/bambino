import { ConvexError } from 'convex/values';
import type { ConvexErrorCode, ConvexErrorData } from '@/convex/errors';

export interface DecodedConvexError {
  /** Present when the server threw a structured `ConvexError`. */
  code?: ConvexErrorCode;
  /** Always a clean, user-presentable string (never the raw Convex framing). */
  message: string;
}

/**
 * Normalize an unknown value thrown by a Convex mutation/query into a
 * `{ code, message }` the UI can switch on.
 *
 * - `ConvexError` with `{ code, message }` data → returns them verbatim so the
 *   caller can special-case predictable codes (e.g. `MATCH_NOT_FOUND`).
 * - any other `Error` (a not-yet-migrated mutation, or an infra failure) →
 *   strips Convex's `"[CONVEX M(foo:bar)] Server Error\nUncaught Error: ..."`
 *   framing so a half-migrated surface still shows something readable.
 * - anything else → the caller's `fallback`.
 */
export function decodeConvexError(err: unknown, fallback: string): DecodedConvexError {
  if (err instanceof ConvexError) {
    const data = err.data as Partial<ConvexErrorData> | string | undefined;
    if (data && typeof data === 'object') {
      const message =
        typeof data.message === 'string' && data.message.length > 0 ? data.message : fallback;
      return { code: data.code, message };
    }
    // A ConvexError thrown with a bare string payload.
    if (typeof data === 'string' && data.length > 0) {
      return { message: stripConvexFraming(data) || fallback };
    }
    return { message: fallback };
  }

  if (err instanceof Error) {
    return { message: stripConvexFraming(err.message) || fallback };
  }

  return { message: fallback };
}

/**
 * Strip the `[CONVEX M(module:fn)] Server Error` / `Uncaught Error:` framing
 * Convex 1.x prepends to plain (non-ConvexError) server errors, leaving just
 * the underlying message.
 */
function stripConvexFraming(message: string): string {
  return message
    .replace(/^\[CONVEX [^\]]+\][^\n]*\n*/i, '')
    .replace(/^Uncaught (?:ConvexError|Error):\s*/i, '')
    .trim();
}
