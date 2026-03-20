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

// Key event names
export const Events = {
  SIGN_UP: 'sign_up',
  SIGN_IN: 'sign_in',
  SEARCH_CREATED: 'search_created',
  NAME_SWIPED: 'name_swiped',
  MATCH_FOUND: 'match_found',
  PURCHASE_COMPLETED: 'purchase_completed',
  PURCHASE_RESTORED: 'purchase_restored',
  ACCOUNT_DELETED: 'account_deleted',
} as const;
