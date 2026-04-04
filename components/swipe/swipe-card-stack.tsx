import { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import { api } from '@/convex/_generated/api';
import { Doc } from '@/convex/_generated/dataModel';
import { SwipeCard } from './swipe-card';
import { EmptyState } from './empty-state';
import { MatchCelebrationModal } from '@/components/matches';
import { Paywall } from '@/components/paywall';
import { CARD_WIDTH, CARD_HEIGHT_FULL } from '@/constants/swipe';
import { useTheme } from '@/contexts/theme-context';

export function SwipeCardStack() {
  const router = useRouter();
  const { colors } = useTheme();

  // Fetch initial queue from backend
  const serverQueue = useQuery(api.selections.getSwipeQueue, {
    limit: 50,
  });

  // Mutations
  const recordSelection = useMutation(api.selections.recordSelection);

  // Local state for optimistic updates
  const [localQueue, setLocalQueue] = useState<Doc<'names'>[]>([]);
  const [matchedName, setMatchedName] = useState<Doc<'names'> | null>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [hintEligible, setHintEligible] = useState(true);

  // Sync server queue to local state (only when server data arrives)
  useEffect(() => {
    if (serverQueue && localQueue.length === 0) {
      setLocalQueue(serverQueue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverQueue]);

  // Handle recording a selection
  const handleSelection = useCallback(
    async (selectionType: 'like' | 'reject') => {
      if (localQueue.length === 0) return;

      const currentName = localQueue[0];

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

        // Check if we got a match
        if (result.match && result.match.name) {
          setMatchedName(result.match.name as Doc<'names'>);
          setShowMatchModal(true);
        }
      } catch (error: unknown) {
        Sentry.captureException(error);
        // Revert on error
        setLocalQueue((prev) => [currentName, ...prev]);
      }
    },
    [localQueue, recordSelection],
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
            showSwipeHint={hintEligible}
            onSwipeHintShown={() => setHintEligible(false)}
            onSwipeLeft={() => handleSelection('reject')}
            onSwipeRight={() => handleSelection('like')}
          />
        ))}
      </View>

      {/* Match celebration modal */}
      <MatchCelebrationModal
        visible={showMatchModal}
        name={matchedName}
        onClose={() => {
          setShowMatchModal(false);
          setMatchedName(null);
        }}
        onViewMatches={() => {
          setShowMatchModal(false);
          setMatchedName(null);
          router.push('/matches' as const);
        }}
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
