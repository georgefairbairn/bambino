import { Alert } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { decodeConvexError } from '@/lib/convex-errors';

/**
 * Decode a Convex match-mutation failure and surface a specific, actionable
 * alert. Predictable outcomes (a deleted match, a stale partnership, a proposal
 * that's no longer pending) are expected control flow rather than bugs — they
 * skip Sentry, and the matches/proposal screens self-heal via their reactive
 * queries. Unknown codes and non-Convex (e.g. network) failures are reported
 * and show the decoded server message instead of a generic "please try again".
 */
export function alertMatchMutationError(error: unknown, fallback: string) {
  const { code, message } = decodeConvexError(error, fallback);
  switch (code) {
    case 'MATCH_NOT_FOUND':
    case 'MATCH_FROM_PREVIOUS_PARTNERSHIP':
      Alert.alert(
        'Match unavailable',
        'This match is no longer available. Your list will refresh.',
      );
      return;
    case 'NO_PARTNER_LINKED':
      Alert.alert('No partner linked', 'Link a partner first to do this.');
      return;
    case 'NO_PENDING_PROPOSAL':
    case 'PROPOSAL_NOT_PENDING':
      Alert.alert('Proposal unavailable', 'This proposal is no longer pending.');
      return;
    default:
      Sentry.captureException(error);
      Alert.alert("Couldn't complete that", message);
  }
}
