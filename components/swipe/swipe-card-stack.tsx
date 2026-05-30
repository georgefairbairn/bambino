import { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import { trackEvent, Events } from '@/lib/analytics';
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
import { CARD_WIDTH, CARD_HEIGHT_FULL } from '@/constants/swipe';
import { useTheme } from '@/contexts/theme-context';
import { useA11yPreferences } from '@/hooks/use-a11y-preferences';
import { usePushPriming } from '@/hooks/use-push-priming';
import { usePushRequestPermission } from '@/hooks/use-push-registration';

export function SwipeCardStack() {
  const router = useRouter();
  const { colors } = useTheme();

  // Random seed lives in state so we can rotate it (and trigger a fresh
  // server query) when the local queue gets low. Initial value is stable
  // for the first fetch.
  const [randomSeed, setRandomSeed] = useState(() => Math.random());

  // Fetch the swipe queue. Each unique randomSeed value corresponds to a
  // distinct server query — when it changes, the next batch of names
  // arrives. We keep all batches we've ever seen accumulated in
  // localQueue (deduped), so swiping never visibly stalls (#160 prefetch).
  const serverQueue = useQuery(api.selections.getSwipeQueue, {
    limit: 50,
    randomSeed,
  });

  // Mutations
  const recordSelection = useMutation(api.selections.recordSelection);

  // Local state for optimistic updates
  const [localQueue, setLocalQueue] = useState<Doc<'names'>[]>([]);
  const localQueueRef = useRef(localQueue);
  localQueueRef.current = localQueue;
  // Track which name IDs have ever been added to localQueue so a re-fetched
  // batch with overlapping results doesn't add duplicates.
  const seenNameIdsRef = useRef<Set<string>>(new Set());
  // Track when we've already kicked off a prefetch for the current low-queue
  // event so we don't fire a flood of seed rotations.
  const prefetchInFlightRef = useRef(false);

  const [showMatchToast, setShowMatchToast] = useState(false);
  const [matchToastName, setMatchToastName] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
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

  // Append server batches to localQueue, skipping anything we've already
  // queued. Initial fetch fills the queue; subsequent fetches (triggered
  // by rotating randomSeed when localQueue is low) extend it so the user
  // never visibly hits the bottom while more names exist.
  useEffect(() => {
    if (!serverQueue) return;
    const fresh = serverQueue.filter((name) => !seenNameIdsRef.current.has(name._id));
    if (fresh.length === 0) {
      // Server returned nothing new (everything was already swiped or
      // already in our local queue). Mark the prefetch resolved so the
      // next low-queue event can try again with a different seed.
      prefetchInFlightRef.current = false;
      return;
    }
    fresh.forEach((name) => seenNameIdsRef.current.add(name._id));
    setLocalQueue((prev) => [...prev, ...fresh]);
    prefetchInFlightRef.current = false;
  }, [serverQueue]);

  // Prefetch trigger: when the queue drops to a small remaining buffer,
  // rotate the random seed so a fresh server query fires before the user
  // hits the bottom and sees a transient empty state.
  const PREFETCH_THRESHOLD = 10;
  useEffect(() => {
    if (prefetchInFlightRef.current) return;
    if (localQueue.length === 0) return; // initial-load case is handled above
    if (localQueue.length > PREFETCH_THRESHOLD) return;
    if (!serverQueue) return; // wait for the current fetch to land first
    prefetchInFlightRef.current = true;
    setRandomSeed(Math.random());
  }, [localQueue.length, serverQueue]);

  // Handle recording a selection — uses ref to avoid recreating on every queue change
  const handleSelection = useCallback(
    async (selectionType: 'like' | 'reject') => {
      const queue = localQueueRef.current;
      if (queue.length === 0) return;

      const currentName = queue[0];

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

        // Check if we got a match
        if (result.match && result.match.name) {
          const matchName = result.match.name as Doc<'names'>;
          setMatchToastName(matchName.name);
          setShowMatchToast(true);
          trackEvent(Events.MATCH_FOUND);
        }
      } catch (error: unknown) {
        Sentry.captureException(error);
        setLocalQueue((prev) => [currentName, ...prev]);
        setShowErrorToast(true);
      }
    },
    [recordSelection],
  );

  // Check for empty state
  const isEmpty = localQueue.length === 0 && serverQueue !== undefined;

  if (isEmpty) {
    return <EmptyState />;
  }

  // Loading state
  if (serverQueue === undefined) {
    return (
      <View style={styles.container}>
        <View style={styles.cardContainer}>
          <View
            style={[
              styles.loadingCard,
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
            ]}
          />
        </View>
      </View>
    );
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
        message="Something went wrong. Please try again."
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
  loadingCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT_FULL,
    borderRadius: 16,
    borderWidth: 3,
  },
});
