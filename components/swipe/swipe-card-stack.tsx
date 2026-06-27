import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import { trackEvent, Events } from '@/lib/analytics';
import { decodeConvexError } from '@/lib/convex-errors';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { SwipeCard } from './swipe-card';
import { SwipeActionButtons, SWIPE_ACTION_BUTTONS_HEIGHT } from './swipe-action-buttons';
import { EmptyState } from './empty-state';
import { MatchToast } from '@/components/matches/match-toast';
import { ErrorToast } from '@/components/ui/error-toast';
import { NameDetailModal } from '@/components/name-detail/name-detail-modal';
import { Paywall } from '@/components/paywall';
import { PushPrimingSheet } from '@/components/push/push-priming-sheet';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { CARD_WIDTH, CARD_HEIGHT_FULL } from '@/constants/swipe';
import { useA11yPreferences } from '@/hooks/use-a11y-preferences';
import { usePushPriming } from '@/hooks/use-push-priming';
import { usePushRequestPermission } from '@/hooks/use-push-registration';

interface SwipeCardStackProps {
  // Fired once per successfully-recorded swipe. Used by the filter-discovery
  // nudge to count consecutive rejects; the stack itself stays nudge-agnostic.
  onSwipeResult?: (type: 'like' | 'reject') => void;
}

export function SwipeCardStack({ onSwipeResult }: SwipeCardStackProps) {
  const router = useRouter();

  // Stable per mount. getSwipeQueue is reactive: every recordSelection
  // invalidates it, so it re-runs with the SAME seed and returns the same
  // ordered set minus the just-swiped name, sliding one more name in from
  // the limit:50 tail. That auto-tops-up the queue without ever changing
  // the query args — so serverQueue only goes `undefined` on the very first
  // load, never mid-session. (Rotating the seed would churn the args and
  // flash the loading state — don't.) Component remounts via the key in
  // explore/index when filters change, giving a fresh seed then.
  const randomSeed = useMemo(() => Math.random(), []);

  const serverQueue = useQuery(api.selections.getSwipeQueue, {
    limit: 50,
    randomSeed,
  });

  // Mutations. The optimistic update bumps getSelectionStats immediately so
  // the liked/rejected count in the header ticks up in lockstep with the
  // card flying away, instead of trailing the server round-trip. Convex
  // rolls this back automatically if the mutation fails.
  //
  // Safe to assume a +1 here: the swipe queue only ever surfaces names the
  // user hasn't acted on (getSwipeQueue excludes swiped names), so every
  // recordSelection from this screen is a brand-new selection.
  const recordSelection = useMutation(api.selections.recordSelection).withOptimisticUpdate(
    (localStore, args) => {
      const stats = localStore.getQuery(api.selections.getSelectionStats, {});
      if (!stats) return;
      if (args.selectionType === 'like') {
        localStore.setQuery(
          api.selections.getSelectionStats,
          {},
          { ...stats, liked: stats.liked + 1, total: stats.total + 1 },
        );
      } else if (args.selectionType === 'reject') {
        localStore.setQuery(
          api.selections.getSelectionStats,
          {},
          { ...stats, rejected: stats.rejected + 1, total: stats.total + 1 },
        );
      }
    },
  );

  // Local state for optimistic updates
  const [localQueue, setLocalQueue] = useState<Doc<'names'>[]>([]);
  const localQueueRef = useRef(localQueue);
  localQueueRef.current = localQueue;
  // Mirror serverQueue into a ref so the focus effect can read it without
  // taking it as a dependency (which would re-run the effect on every
  // swipe and create a seed-rotation feedback loop).
  const serverQueueRef = useRef(serverQueue);
  serverQueueRef.current = serverQueue;
  // Track which name IDs are already in localQueue so the reactive query's
  // re-runs (which return overlapping results) only append genuinely new
  // names rather than duplicating what's already shown.
  const seenNameIdsRef = useRef<Set<string>>(new Set());

  const [showMatchToast, setShowMatchToast] = useState(false);
  const [matchToastName, setMatchToastName] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorToastMessage, setErrorToastMessage] = useState(
    'Something went wrong. Please try again.',
  );
  const [hintEligible, setHintEligible] = useState(true);
  const [showPushPriming, setShowPushPriming] = useState(false);

  const { shouldPrime, markAsked, markDismissed } = usePushPriming();
  const requestPermission = usePushRequestPermission();
  const { needsButtons, reduceMotion } = useA11yPreferences();

  // Prefetch popularity summaries for the top TWO cards (#174). Querying the
  // next card's summary now means it's already cached by the time the user
  // swipes and it becomes top — no flash of an empty sparkline tile.
  const topName = localQueue[0];
  const nextName = localQueue[1];
  const topSummary = useQuery(
    api.popularity.getNamePopularitySummary,
    topName ? { name: topName.name, gender: topName.gender } : 'skip',
  );
  const nextSummary = useQuery(
    api.popularity.getNamePopularitySummary,
    nextName ? { name: nextName.name, gender: nextName.gender } : 'skip',
  );

  // Append newly-eligible names from the reactive query to localQueue. The
  // query re-runs on every swipe (and whenever selections change), returning
  // the current eligible set minus already-seen names; we append only the
  // genuinely-new ones, preserving the references of cards already on screen
  // so the swipe animation never re-renders mid-gesture.
  useEffect(() => {
    if (!serverQueue) return;
    const fresh = serverQueue.filter((name) => !seenNameIdsRef.current.has(name._id));
    if (fresh.length === 0) return;
    fresh.forEach((name) => seenNameIdsRef.current.add(name._id));
    setLocalQueue((prev) => [...prev, ...fresh]);
  }, [serverQueue]);

  // When the user returns to the swipe screen after the queue emptied (e.g.
  // they exhausted a filter, then went to History and un-liked/deleted some
  // names so they're swipe-eligible again), clear the seen-set so the
  // reactive query's restored names get appended. The query already
  // re-includes them — we just need to stop filtering them as "seen".
  // Only fires when the queue is empty, so returning mid-stack preserves
  // the user's position.
  //
  // Empty dep array is deliberate: run once per focus transition, reading
  // current state via refs. Depending on serverQueue would re-fire on every
  // swipe.
  useFocusEffect(
    useCallback(() => {
      if (localQueueRef.current.length === 0 && serverQueueRef.current !== undefined) {
        seenNameIdsRef.current.clear();
        // Re-append whatever the current query already holds (its names were
        // being filtered out as "seen" until we cleared the set above).
        const current = serverQueueRef.current;
        if (current.length > 0) {
          current.forEach((name) => seenNameIdsRef.current.add(name._id));
          setLocalQueue(current);
        }
      }
    }, []),
  );

  // Handle recording a selection — uses ref to avoid recreating on every queue change
  const handleSelection = useCallback(
    async (selectionType: 'like' | 'reject') => {
      const queue = localQueueRef.current;
      if (queue.length === 0) return;

      const currentName = queue[0];
      if (!currentName) return;

      // Optimistic update - remove from queue
      setLocalQueue((prev) => prev.slice(1));

      // Record to backend
      try {
        const result = await recordSelection({
          nameId: currentName._id,
          selectionType,
        });

        // Check if free tier limit was hit
        if (result && 'error' in result) {
          setShowPaywall(true);
          setLocalQueue((prev) => [currentName, ...prev]);
          return;
        }

        trackEvent(Events.NAME_SWIPED, { direction: selectionType });
        onSwipeResult?.(selectionType);

        // Check if we got a match
        if (result.match && result.match.name) {
          const matchName = result.match.name as Doc<'names'>;
          setMatchToastName(matchName.name);
          setShowMatchToast(true);
          trackEvent(Events.MATCH_FOUND);
        }
      } catch (error: unknown) {
        Sentry.captureException(error);
        // Roll back the optimistic removal so the card returns to the queue.
        setLocalQueue((prev) => [currentName, ...prev]);
        const { message } = decodeConvexError(error, 'Something went wrong. Please try again.');
        setErrorToastMessage(message);
        setShowErrorToast(true);
      }
    },
    [recordSelection, onSwipeResult],
  );

  // Check for empty state
  const isEmpty = localQueue.length === 0 && serverQueue !== undefined;

  if (isEmpty) {
    return <EmptyState onOpenFilters={() => router.push('/(tabs)/explore/filters')} />;
  }

  // Loading state — full-screen Bambino loader while the first queue fetch
  // resolves (matches the loader shown elsewhere on initial data loads).
  if (serverQueue === undefined) {
    return <LoadingScreen isLoading />;
  }

  return (
    <View style={styles.container}>
      {/* Card stack */}
      <View style={styles.cardContainer}>
        {localQueue.slice(0, 2).map((name, index) => (
          <SwipeCard
            key={name._id}
            name={name}
            isTop={index === 0}
            showSwipeHint={hintEligible && !needsButtons}
            swipeEnabled={!showDetailModal && !needsButtons}
            detailOpen={showDetailModal}
            cardHeight={needsButtons ? CARD_HEIGHT_FULL - SWIPE_ACTION_BUTTONS_HEIGHT : undefined}
            popularitySummary={index === 0 ? topSummary : nextSummary}
            onSwipeHintShown={() => setHintEligible(false)}
            onSwipeHintReset={() => setHintEligible(true)}
            onSwipeLeft={() => handleSelection('reject')}
            onSwipeRight={() => handleSelection('like')}
            onDetailPress={() => setShowDetailModal(true)}
          />
        ))}
      </View>

      {/* Accessibility-only Pass/Like buttons — pan gesture conflicts with
          VoiceOver, and Reduce Motion users may also prefer explicit taps (#162). */}
      {needsButtons && (
        <SwipeActionButtons
          onLike={() => handleSelection('like')}
          onNope={() => handleSelection('reject')}
          disabled={localQueue.length === 0}
          reduceMotion={reduceMotion}
        />
      )}

      {/* Subsequent match toast */}
      <MatchToast
        visible={showMatchToast}
        name={matchToastName ?? ''}
        onPress={() => {
          setShowMatchToast(false);
          setMatchToastName(null);
          router.push('/matches' as const);
        }}
        onDismiss={async () => {
          setShowMatchToast(false);
          setMatchToastName(null);
          // After a fresh match auto-dismisses, this is the moment iOS push
          // notifications become valuable — ask now while the user is engaged.
          if (await shouldPrime()) {
            setShowPushPriming(true);
          }
        }}
      />

      {/* Notification permission priming — fires after a fresh match (#156) */}
      <PushPrimingSheet
        visible={showPushPriming}
        onAllow={async () => {
          await requestPermission();
          await markAsked();
          setShowPushPriming(false);
        }}
        onDismiss={async () => {
          await markDismissed();
          setShowPushPriming(false);
        }}
      />

      {/* Swipe error toast */}
      <ErrorToast
        visible={showErrorToast}
        message={errorToastMessage}
        onDismiss={() => setShowErrorToast(false)}
      />

      {/* Name detail modal — opened by tapping popularity row */}
      <NameDetailModal
        visible={showDetailModal}
        name={localQueue[0] ?? null}
        context="swipe"
        onClose={() => setShowDetailModal(false)}
      />

      {/* Swipe limit paywall */}
      <Paywall visible={showPaywall} onClose={() => setShowPaywall(false)} trigger="swipe_limit" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 85, // Account for absolutely-positioned tab bar
  },
  cardContainer: {
    flex: 1,
    width: CARD_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
