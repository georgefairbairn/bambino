import { useCallback, useRef, useState } from 'react';
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
  // Drop-down banner over the card stack. Shown on the trigger swipe, removed
  // on the next swipe.
  bannerVisible: boolean;
  // Filters-pill pulse. Shown on the trigger swipe, persists until the user
  // presses Filters (onFilterPressed).
  pulseActive: boolean;
  registerSwipe: (type: 'like' | 'reject') => void;
  onFilterPressed: () => void;
}

/**
 * One-time "Adjust your filters" nudge. Counts consecutive rejects (a like
 * resets the count) and, once the user hits the threshold without ever opening
 * Filters and without having seen the nudge, drops in a banner and starts the
 * Filters-pill pulse.
 *
 * The two cues dismiss differently: the banner clears on the very next swipe,
 * while the pulse keeps going until the user actually opens Filters. Both fire
 * at most once per user — `firedThisSessionRef` blocks a repeat within the
 * session and `markFilterNudgeShown` persists it across devices. Eligibility
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

  const [bannerVisible, setBannerVisible] = useState(false);
  const [pulseActive, setPulseActive] = useState(false);

  const consecutiveRejectsRef = useRef(0);
  const firedThisSessionRef = useRef(false);
  // Synchronous mirror of bannerVisible so registerSwipe can tell whether the
  // banner is already showing (and should be dismissed) without depending on
  // the async state value.
  const bannerVisibleRef = useRef(false);

  // Latest eligibility flags, read inside the stable registerSwipe callback.
  const flagsRef = useRef({ hasOpenedFilters, filterNudgeShown });
  flagsRef.current = { hasOpenedFilters, filterNudgeShown };

  const setBanner = useCallback((value: boolean) => {
    bannerVisibleRef.current = value;
    setBannerVisible(value);
  }, []);

  const onFilterPressed = useCallback(() => {
    setPulseActive(false);
    setBanner(false);
  }, [setBanner]);

  const registerSwipe = useCallback(
    (type: 'like' | 'reject') => {
      // Any swipe AFTER the banner appeared dismisses it (it was shown on a
      // prior swipe). The trigger swipe below won't hit this because the banner
      // isn't visible yet at this point.
      if (bannerVisibleRef.current) {
        setBanner(false);
      }

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
      setBanner(true);
      setPulseActive(true);
      trackEvent(Events.FILTER_NUDGE_SHOWN);
      void markFilterNudgeShown();
    },
    [markFilterNudgeShown, setBanner],
  );

  return { bannerVisible, pulseActive, registerSwipe, onFilterPressed };
}
