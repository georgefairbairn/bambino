import { Doc } from './_generated/dataModel';

/**
 * When the partner-invite nudge slides up on Explore for an unpartnered user.
 * Counted in swipes, not likes: picky users swipe hundreds of names while
 * liking fewer than ten, and a likes threshold never asked them. A "Not now"
 * earns one more ask once they've kept swiping, then it stops for good.
 */
export const INVITE_NUDGE_FIRST_AT_SWIPES = 20;
export const INVITE_NUDGE_REPEAT_AFTER_SWIPES = 100;
export const INVITE_NUDGE_MAX_SHOWS = 2;

type NudgeUser = Pick<
  Doc<'users'>,
  | 'partnerId'
  | 'lifetimeSwipeCount'
  | 'likedCount'
  | 'rejectedCount'
  | 'skippedCount'
  | 'inviteNudgeShown'
  | 'inviteNudgeShowCount'
  | 'inviteNudgeLastShownAtSwipes'
>;

/** Swipes ever made. lifetimeSwipeCount never drops on undo; the counters are a fallback. */
export function swipesSoFar(user: NudgeUser): number {
  return (
    user.lifetimeSwipeCount ??
    (user.likedCount ?? 0) + (user.rejectedCount ?? 0) + (user.skippedCount ?? 0)
  );
}

/**
 * How many times the nudge has shown. Rows from before the schedule only have
 * the old one-time flag; they count as shown once, at swipe 0, so the people
 * who already dismissed it get their second ask after 100 swipes.
 */
function showsSoFar(user: NudgeUser): { count: number; lastAt: number } {
  if (user.inviteNudgeShowCount !== undefined) {
    return { count: user.inviteNudgeShowCount, lastAt: user.inviteNudgeLastShownAtSwipes ?? 0 };
  }
  return user.inviteNudgeShown === true ? { count: 1, lastAt: 0 } : { count: 0, lastAt: 0 };
}

export function isInviteNudgeDue(user: NudgeUser): boolean {
  if (user.partnerId) return false;
  const { count, lastAt } = showsSoFar(user);
  if (count >= INVITE_NUDGE_MAX_SHOWS) return false;
  const swipes = swipesSoFar(user);
  if (count === 0) return swipes >= INVITE_NUDGE_FIRST_AT_SWIPES;
  return swipes >= lastAt + INVITE_NUDGE_REPEAT_AFTER_SWIPES;
}

/** The patch that records a showing at the user's current swipe count. */
export function inviteNudgeShownPatch(user: NudgeUser) {
  return {
    inviteNudgeShown: true,
    inviteNudgeShowCount: showsSoFar(user).count + 1,
    inviteNudgeLastShownAtSwipes: swipesSoFar(user),
  };
}
