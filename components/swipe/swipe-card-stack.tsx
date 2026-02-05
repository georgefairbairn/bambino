import { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { SwipeCard, SwipeCardRef } from './swipe-card';
import { SwipeActionButtons } from './swipe-action-buttons';
import { EmptyState } from './empty-state';
import { MatchCelebrationModal } from '@/components/matches';
import * as Haptics from 'expo-haptics';
import { CARD_WIDTH, CARD_HEIGHT_FULL } from '@/constants/swipe';

interface SwipeCardStackProps {
  searchId: Id<'searches'>;
  onEmpty?: () => void;
}

export function SwipeCardStack({ searchId }: SwipeCardStackProps) {
  const router = useRouter();

  // Fetch initial queue from backend
  const serverQueue = useQuery(api.selections.getSwipeQueue, {
    searchId,
    limit: 50,
  });

  // Mutations
  const recordSelection = useMutation(api.selections.recordSelection);

  // Local state for optimistic updates
  const [localQueue, setLocalQueue] = useState<Doc<'names'>[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [matchedName, setMatchedName] = useState<Doc<'names'> | null>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);

  // Ref to the top card for triggering programmatic swipes
  const topCardRef = useRef<SwipeCardRef>(null);

  // Track pending selection from button press (to be executed after animation)
  const pendingSelectionRef = useRef<'like' | 'reject' | null>(null);

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
          searchId,
          nameId: currentName._id,
          selectionType,
        });

        // Check if we got a match
        if (result.match && result.match.name) {
          setMatchedName(result.match.name as Doc<'names'>);
          setShowMatchModal(true);
        }
      } catch (error) {
        // Revert on error
        console.error('Failed to record selection:', error);
        setLocalQueue((prev) => [currentName, ...prev]);
      }
    },
    [localQueue, searchId, recordSelection],
  );

  // Button handlers that trigger card animations (selection deferred until animation completes)
  const handleLikeButton = useCallback(() => {
    if (localQueue.length === 0 || isAnimating) return;
    setIsAnimating(true);
    pendingSelectionRef.current = 'like';
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    topCardRef.current?.swipeRight();
  }, [localQueue, isAnimating]);

  const handleNopeButton = useCallback(() => {
    if (localQueue.length === 0 || isAnimating) return;
    setIsAnimating(true);
    pendingSelectionRef.current = 'reject';
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    topCardRef.current?.swipeLeft();
  }, [localQueue, isAnimating]);

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
          <View style={styles.loadingCard} />
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
            ref={index === 0 ? topCardRef : null}
            name={name}
            isTop={index === 0}
            onSwipeLeft={() => handleSelection('reject')}
            onSwipeRight={() => handleSelection('like')}
            onSwipeComplete={() => {
              // Handle pending selection from button press
              if (pendingSelectionRef.current) {
                handleSelection(pendingSelectionRef.current);
                pendingSelectionRef.current = null;
              }
              setIsAnimating(false);
            }}
          />
        ))}
      </View>

      {/* Action buttons */}
      <SwipeActionButtons
        onLike={handleLikeButton}
        onNope={handleNopeButton}
        disabled={isAnimating || localQueue.length === 0}
      />

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
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
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#e5e7eb',
  },
});
