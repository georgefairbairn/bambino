import { View, Text, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { Doc } from '@/convex/_generated/dataModel';
import { useCardAnimation } from '@/hooks/use-card-animation';
import { useSwipeGesture } from '@/hooks/use-swipe-gesture';
import { CARD_WIDTH, CARD_HEIGHT, CARD_STYLES, SWIPE_COLORS } from '@/constants/swipe';
import { Fonts } from '@/constants/theme';
import { RankBadge, SparklineChart } from '@/components/popularity';

interface SwipeCardProps {
  name: Doc<'names'>;
  isTop: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeComplete?: (direction: 'left' | 'right') => void;
}

export function SwipeCard({
  name,
  isTop,
  onSwipeLeft,
  onSwipeRight,
  onSwipeComplete,
}: SwipeCardProps) {
  const {
    translateX,
    translateY,
    updatePosition,
    resetPosition,
    swipeLeft,
    swipeRight,
    cardAnimatedStyle,
    likeOverlayStyle,
    nopeOverlayStyle,
  } = useCardAnimation({ onSwipeComplete });

  const { panGesture } = useSwipeGesture({
    translateX,
    translateY,
    updatePosition,
    resetPosition,
    swipeLeft,
    swipeRight,
    onSwipeLeft,
    onSwipeRight,
    enabled: isTop,
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, isTop && cardAnimatedStyle]}>
        {/* LIKE overlay - visible when swiping right */}
        <Animated.View style={[styles.overlay, styles.likeOverlay, likeOverlayStyle]}>
          <Text style={[styles.overlayText, styles.likeText]}>LIKE</Text>
        </Animated.View>

        {/* NOPE overlay - visible when swiping left */}
        <Animated.View style={[styles.overlay, styles.nopeOverlay, nopeOverlayStyle]}>
          <Text style={[styles.overlayText, styles.nopeText]}>NOPE</Text>
        </Animated.View>

        {/* Card content */}
        <View style={styles.content}>
          {/* Rank badge */}
          <View style={styles.rankBadgeContainer}>
            <RankBadge rank={name.currentRank} size="small" />
          </View>

          {/* Name */}
          <Text style={styles.name}>{name.name}</Text>

          {/* Metadata */}
          <View style={styles.metadata}>
            {name.origin && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Origin</Text>
                <Text style={styles.metaValue}>{name.origin}</Text>
              </View>
            )}
            {name.meaning && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Meaning</Text>
                <Text style={styles.metaValue}>{name.meaning}</Text>
              </View>
            )}
            {name.phonetic && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Pronunciation</Text>
                <Text style={styles.metaValue}>{name.phonetic}</Text>
              </View>
            )}
          </View>

          {/* Sparkline chart */}
          {name.gender !== 'neutral' && (
            <View style={styles.sparklineContainer}>
              <SparklineChart
                name={name.name}
                gender={name.gender as 'male' | 'female' | 'neutral'}
              />
            </View>
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: CARD_STYLES.backgroundColor,
    borderRadius: CARD_STYLES.borderRadius,
    shadowColor: CARD_STYLES.shadowColor,
    shadowOpacity: CARD_STYLES.shadowOpacity,
    shadowRadius: CARD_STYLES.shadowRadius,
    shadowOffset: CARD_STYLES.shadowOffset,
    elevation: 8,
    position: 'absolute',
  },
  overlay: {
    position: 'absolute',
    top: 40,
    padding: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 3,
    zIndex: 10,
  },
  likeOverlay: {
    left: 20,
    borderColor: SWIPE_COLORS.like,
    transform: [{ rotate: '-15deg' }],
  },
  nopeOverlay: {
    right: 20,
    borderColor: SWIPE_COLORS.nope,
    transform: [{ rotate: '15deg' }],
  },
  overlayText: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  likeText: {
    color: SWIPE_COLORS.like,
  },
  nopeText: {
    color: SWIPE_COLORS.nope,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  rankBadgeContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  name: {
    fontSize: 48,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 24,
  },
  metadata: {
    width: '100%',
    gap: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    gap: 8,
  },
  metaLabel: {
    fontSize: 14,
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metaValue: {
    fontSize: 16,
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    color: '#374151',
    flexShrink: 1,
    textAlign: 'center',
  },
  sparklineContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
});
