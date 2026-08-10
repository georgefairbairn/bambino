import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import * as Sentry from '@sentry/react-native';

// Persisted once-ever flag: Apple's in-app review ask is spent a single time.
const REVIEW_PROMPTED_KEY = 'bambino_review_prompted';
// Fire after the user has liked this many names. Deliberately NOT 10: the
// one-time partner-invite nudge fires at 10 likes on the same screen, and the
// two stacked on top of each other. Keep these thresholds apart.
const LIKE_THRESHOLD = 25;

/**
 * Shows Apple's native in-app review card once, ever, after the user reaches
 * LIKE_THRESHOLD likes. Apple rate-limits requestReview() and may show nothing;
 * the AsyncStorage flag guarantees we only attempt it once regardless, and the
 * ref guards against re-fires within a session.
 */
export function useReviewPrompt(likedCount: number | undefined) {
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) return;
    if (likedCount === undefined || likedCount < LIKE_THRESHOLD) return;
    attemptedRef.current = true;

    (async () => {
      try {
        if (await AsyncStorage.getItem(REVIEW_PROMPTED_KEY)) return;
        if (!(await StoreReview.isAvailableAsync())) return;
        // Set the flag before requesting so a crash mid-prompt can't re-ask.
        await AsyncStorage.setItem(REVIEW_PROMPTED_KEY, 'true');
        await StoreReview.requestReview();
      } catch (err) {
        Sentry.captureException(err, { tags: { phase: 'review_prompt' } });
      }
    })();
  }, [likedCount]);
}
