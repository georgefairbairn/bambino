import PostHog from 'posthog-react-native';

let posthog: PostHog | null = null;

const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

export async function initAnalytics() {
  if (!POSTHOG_API_KEY || __DEV__) return;

  posthog = new PostHog(POSTHOG_API_KEY, {
    host: POSTHOG_HOST,
  });
}

export function identifyUser(
  userId: string,
  properties?: Record<string, string | number | boolean>,
) {
  posthog?.identify(userId, properties);
}

export function trackEvent(event: string, properties?: Record<string, string | number | boolean>) {
  posthog?.capture(event, properties);
}

export function trackScreen(screenName: string) {
  posthog?.screen(screenName);
}

export function resetAnalytics() {
  posthog?.reset();
}

// Event taxonomy. Naming convention: object_past-tense-verb, snake_case.
export const Events = {
  // Auth & identity
  SIGN_IN: 'sign_in',
  SIGN_IN_FAILED: 'sign_in_failed',
  SIGN_UP: 'sign_up',
  SIGN_UP_FAILED: 'sign_up_failed',
  SIGNED_OUT: 'signed_out',
  ACCOUNT_DELETED: 'account_deleted',

  // Onboarding
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_SLIDE_ADVANCED: 'onboarding_slide_advanced',
  ONBOARDING_COMPLETED: 'onboarding_completed',

  // Swipe & matches
  NAME_SWIPED: 'name_swiped',
  MATCH_FOUND: 'match_found',
  MATCH_VIEWED: 'match_viewed',
  MATCH_FAVORITED: 'match_favorited',
  NAME_CHOSEN: 'name_chosen',
  MATCH_REMOVED: 'match_removed',
  PROPOSAL_SENT: 'proposal_sent',
  PROPOSAL_ACCEPTED: 'proposal_accepted',
  PROPOSAL_DECLINED: 'proposal_declined',
  PROPOSAL_WITHDRAWN: 'proposal_withdrawn',

  // Partner
  PARTNER_CODE_COPIED: 'partner_code_copied',
  PARTNER_CODE_SHARED: 'partner_code_shared',
  PARTNER_LINKED: 'partner_linked',
  PARTNER_UNLINKED: 'partner_unlinked',

  // Safety
  CONTENT_REPORTED: 'content_reported',

  // Settings
  THEME_CHANGED: 'theme_changed',
  SKIN_TONE_CHANGED: 'skin_tone_changed',
  VOICE_CHANGED: 'voice_changed',
  FILTERS_CHANGED: 'filters_changed',

  // Paywall & purchases
  PAYWALL_SHOWN: 'paywall_shown',
  PURCHASE_ATTEMPTED: 'purchase_attempted',
  PURCHASE_COMPLETED: 'purchase_completed',
  PURCHASE_FAILED: 'purchase_failed',
  PURCHASE_RESTORED: 'purchase_restored',

  // Notifications
  PUSH_PERMISSION_REQUESTED: 'push_permission_requested',
  PUSH_PERMISSION_GRANTED: 'push_permission_granted',
  PUSH_PERMISSION_DENIED: 'push_permission_denied',
} as const;
