import { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useQuery, useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { SwipeCard } from './swipe-card';
import { SwipeActionButtons } from './swipe-action-buttons';
import { UndoButton } from './undo-button';
import { EmptyState } from './empty-state';
import { MatchCelebrationModal } from '@/components/matches';
import { useCardAnimation } from '@/hooks/use-card-animation';
import * as Haptics from 'expo-haptics';
import { CARD_WIDTH, CARD_HEIGHT, PEEK_CARD } from '@/constants/swipe';

interface SwipeCardStackProps {
  sessionId: Id<'sessions'>;
  onEmpty?: () => void;
}

export function SwipeCardStack({ sessionId }: SwipeCardStackProps) {
  const router = useRouter();

  // Fetch initial queue from backend
  const serverQueue = useQuery(api.selections.getSwipeQueue, {
    sessionId,
    limit: 50,
  });

  // Mutations
  const recordSelection = useMutation(api.selections.recordSelection);
  const undoLastSelection = useMutation(api.selections.undoLastSelection);

  // Local state for optimistic updates
  const [localQueue, setLocalQueue] = useState<Doc<'names'>[]>([]);
  const [lastAction, setLastAction] = useState<{
    name: Doc<'names'>;
    selectionType: 'like' | 'reject' | 'skip';
  } | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [matchedName, setMatchedName] = useState<Doc<'names'> | null>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);

  // Card animation for the top card
  const topCardAnimation = useCardAnimation({
    onSwipeComplete: () => {
      setIsAnimating(false);
    },
  });

  // Sync server queue to local state (only when server data arrives)
  useEffect(() => {
    if (serverQueue && localQueue.length === 0) {
      setLocalQueue(serverQueue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverQueue]);

  // Handle recording a selection
  const handleSelection = useCallback(
    async (selectionType: 'like' | 'reject' | 'skip') => {
      if (localQueue.length === 0 || isAnimating) return;

      const currentName = localQueue[0];

      // Store for potential undo
      setLastAction({ name: currentName, selectionType });

      // Optimistic update - remove from queue
      setLocalQueue((prev) => prev.slice(1));

      // Record to backend
      try {
        const result = await recordSelection({
          sessionId,
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
        setLastAction(null);
      }
    },
    [localQueue, sessionId, recordSelection, isAnimating],
  );

  // Handle skip - add back to end of queue
  const handleSkip = useCallback(async () => {
    if (localQueue.length === 0 || isAnimating) return;

    const currentName = localQueue[0];

    // Store for potential undo
    setLastAction({ name: currentName, selectionType: 'skip' });

    // Optimistic update - move to end of queue
    setLocalQueue((prev) => [...prev.slice(1), currentName]);

    // Record to backend
    try {
      await recordSelection({
        sessionId,
        nameId: currentName._id,
        selectionType: 'skip',
      });
    } catch (error) {
      // Revert on error
      console.error('Failed to record skip:', error);
      setLocalQueue((prev) => [currentName, ...prev.slice(0, -1)]);
      setLastAction(null);
    }
  }, [localQueue, sessionId, recordSelection, isAnimating]);

  // Handle undo
  const handleUndo = useCallback(async () => {
    try {
      const result = await undoLastSelection({ sessionId });
      if (result && result.name) {
        // Add the name back to the front of the queue
        setLocalQueue((prev) => [result.name as Doc<'names'>, ...prev]);
        setLastAction(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Failed to undo:', error);
    }
  }, [sessionId, undoLastSelection]);

  // Button handlers that trigger card animations
  const handleLikeButton = useCallback(() => {
    if (localQueue.length === 0 || isAnimating) return;
    setIsAnimating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    topCardAnimation.swipeRight();
    handleSelection('like');
  }, [localQueue, isAnimating, topCardAnimation, handleSelection]);

  const handleNopeButton = useCallback(() => {
    if (localQueue.length === 0 || isAnimating) return;
    setIsAnimating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    topCardAnimation.swipeLeft();
    handleSelection('reject');
  }, [localQueue, isAnimating, topCardAnimation, handleSelection]);

  const handleSkipButton = useCallback(() => {
    if (localQueue.length === 0 || isAnimating) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleSkip();
  }, [localQueue, isAnimating, handleSkip]);

  // Check for empty state
  const isEmpty = localQueue.length === 0 && serverQueue !== undefined;

  if (isEmpty) {
    return <EmptyState onUndo={lastAction ? handleUndo : undefined} />;
  }

  // Loading state
  if (serverQueue === undefined) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingCard} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Card stack */}
      <View style={styles.cardContainer}>
        {/* Render up to 2 cards: peek card (behind) and active card (top) */}
        {localQueue.slice(0, 2).map((name, index) => {
          const isTop = index === 0;
          const isPeek = index === 1;

          if (isPeek) {
            return (
              <Animated.View
                key={name._id}
                style={[
                  styles.peekCard,
                  {
                    transform: [{ scale: PEEK_CARD.scale }],
                    top: PEEK_CARD.translateY,
                  },
                ]}
              >
                <SwipeCard name={name} isTop={false} />
              </Animated.View>
            );
          }

          return (
            <SwipeCard
              key={name._id}
              name={name}
              isTop={isTop}
              onSwipeLeft={() => handleSelection('reject')}
              onSwipeRight={() => handleSelection('like')}
              onSwipeComplete={() => {
                setIsAnimating(false);
                topCardAnimation.resetImmediate();
              }}
            />
          );
        })}
      </View>

      {/* Action buttons */}
      <SwipeActionButtons
        onLike={handleLikeButton}
        onNope={handleNopeButton}
        onSkip={handleSkipButton}
        disabled={isAnimating || localQueue.length === 0}
      />

      {/* Undo button */}
      {lastAction && <UndoButton onUndo={handleUndo} />}

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
    justifyContent: 'center',
    paddingBottom: 100,
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  peekCard: {
    position: 'absolute',
    zIndex: -1,
  },
  loadingCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#f3f4f6',
    borderRadius: 24,
  },
});
