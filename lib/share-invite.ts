import { Share } from 'react-native';
import { buildInviteMessage } from '@/constants/links';
import { Events, trackEvent } from '@/lib/analytics';

/** Every place the app offers the partner code, for share/copy attribution. */
export type InviteSource =
  | 'settings'
  | 'matches_empty'
  | 'invite_nudge'
  | 'onboarding'
  | 'explore_banner';

/**
 * Open the share sheet with the partner invite. Returns true only when the
 * user actually sent it; PARTNER_CODE_SHARED fires on that path alone, so a
 * cancelled sheet no longer counts as a share. Throws whatever Share.share
 * throws, so callers keep their own Sentry handling.
 */
export async function shareInvite(shareCode: string, source: InviteSource): Promise<boolean> {
  const result = await Share.share({ message: buildInviteMessage(shareCode) });
  const shared = result.action === Share.sharedAction;
  if (shared) trackEvent(Events.PARTNER_CODE_SHARED, { source });
  return shared;
}
