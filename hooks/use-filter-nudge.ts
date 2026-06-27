import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { trackEvent, Events } from '@/lib/analytics';
import { FILTER_NUDGE_REJECT_THRESHOLD } from '@/constants/swipe';

interface UseFilterNudgeArgs {
  // From the getCurrentUser doc. undefined while the user query is loading.
  hasOpenedFilters: boolean | undefined;
  filterNudgeShown: boolean | undefined;
}

interface UseFilterNudge {
  nudgeVisible: boolean;
  registerSwipe: (type: 'like' | 'reject') => void;
  dismissNudge: () => void;
}

// How long the tooltip lingers before auto-dismissing.
const AUTO_DISMISS_MS = 6000;

/**
 * One-time "Adjust your filters" nudge. Counts consecutive rejects (a like
 * resets the count) and reveals the tooltip when the user has hit the threshold
 * without ever opening Filters and without having seen the nudge before.
 *
 * Two guarantees combine: `firedThisSessionRef` blocks a second reveal within
 * the session (synchronous, no round-trip), and `markFilterNudgeShown` persists
 * the flag on the user row so it never reappears on any device. Eligibility
 * flags are read via a ref so `registerSwipe` keeps a stable identity and never
 * forces the swipe stack to re-render mid-session.
 */
export function useFilterNudge({
  hasOpenedFilters,
  filterNudgeShown,
}: UseFilterNudgeArgs): UseFilterNudge {
  const markFilterNudgeShown = useMutation(api.users.markFilterNudgeShown).withOptimisticUpdate(
    (store) => {
      const current = store.getQuery(api.users.getCurrentUser, {});
      if (current) {
        store.setQuery(api.users.getCurrentUser, {}, { ...current, filterNudgeShown: true });
      }
    },
  );

  const [nudgeVisible, setNudgeVisible] = useState(false);
  const consecutiveRejectsRef = useRef(0);
  const firedThisSessionRef = useRef(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Latest eligibility flags, read inside the stable registerSwipe callback.
  const flagsRef = useRef({ hasOpenedFilters, filterNudgeShown });
  flagsRef.current = { hasOpenedFilters, filterNudgeShown };

  const clearTimer = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const dismissNudge = useCallback(() => {
    clearTimer();
    setNudgeVisible(false);
  }, [clearTimer]);

  const registerSwipe = useCallback(
    (type: 'like' | 'reject') => {
      if (type === 'like') {
        consecutiveRejectsRef.current = 0;
        return;
      }
      consecutiveRejectsRef.current += 1;
      const { hasOpenedFilters: opened, filterNudgeShown: shown } = flagsRef.current;
      if (
        consecutiveRejectsRef.current < FILTER_NUDGE_REJECT_THRESHOLD ||
        firedThisSessionRef.current ||
        opened === true ||
        shown === true
      ) {
        return;
      }
      firedThisSessionRef.current = true;
      setNudgeVisible(true);
      trackEvent(Events.FILTER_NUDGE_SHOWN);
      void markFilterNudgeShown();
      dismissTimerRef.current = setTimeout(() => {
        dismissTimerRef.current = null;
        setNudgeVisible(false);
      }, AUTO_DISMISS_MS);
    },
    [markFilterNudgeShown],
  );

  // Clear any pending timer if the hook unmounts.
  useEffect(() => clearTimer, [clearTimer]);

  return { nudgeVisible, registerSwipe, dismissNudge };
}
