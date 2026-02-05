import { useEffect, useRef } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Doc } from '@/convex/_generated/dataModel';
import { Fonts } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

interface MatchCelebrationModalProps {
  visible: boolean;
  name: Doc<'names'> | null;
  onClose: () => void;
  onViewMatches?: () => void;
}

export function MatchCelebrationModal({
  visible,
  name,
  onClose,
  onViewMatches,
}: MatchCelebrationModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const heartsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Trigger haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Reset animations
      scaleAnim.setValue(0);
      rotateAnim.setValue(0);
      heartsAnim.setValue(0);

      // Start animations
      Animated.parallel([
        // Scale bounce
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 50,
          useNativeDriver: true,
        }),
        // Subtle rotate
        Animated.sequence([
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 150,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: -1,
            duration: 150,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 0,
            duration: 150,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        // Hearts float up
        Animated.timing(heartsAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scaleAnim, rotateAnim, heartsAnim]);

  if (!name) return null;

  const rotate = rotateAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-5deg', '0deg', '5deg'],
  });

  const heartsOpacity = heartsAnim.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });

  const heartsTranslateY = heartsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -100],
  });

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        {/* Floating hearts */}
        <Animated.View
          style={[
            styles.heartsContainer,
            {
              opacity: heartsOpacity,
              transform: [{ translateY: heartsTranslateY }],
            },
          ]}
        >
          <Ionicons name="heart" size={24} color="#ef4444" style={styles.heart1} />
          <Ionicons name="heart" size={32} color="#f472b6" style={styles.heart2} />
          <Ionicons name="heart" size={20} color="#ef4444" style={styles.heart3} />
          <Ionicons name="heart" size={28} color="#f472b6" style={styles.heart4} />
        </Animated.View>

        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ scale: scaleAnim }, { rotate }],
            },
          ]}
        >
          {/* Match badge */}
          <View style={styles.matchBadge}>
            <Ionicons name="heart" size={20} color="#fff" />
            <Text style={styles.matchBadgeText}>{"It's a Match!"}</Text>
            <Ionicons name="heart" size={20} color="#fff" />
          </View>

          {/* Name */}
          <Text style={styles.name}>{name.name}</Text>

          {/* Description */}
          <Text style={styles.description}>You and your partner both love this name!</Text>

          {/* Buttons */}
          <View style={styles.buttons}>
            <Pressable style={styles.keepSwipingButton} onPress={onClose}>
              <Ionicons name="swap-horizontal" size={20} color="#0a7ea4" />
              <Text style={styles.keepSwipingText}>Keep Swiping</Text>
            </Pressable>

            {onViewMatches && (
              <Pressable
                style={styles.viewMatchesButton}
                onPress={() => {
                  onClose();
                  onViewMatches();
                }}
              >
                <Ionicons name="heart" size={20} color="#fff" />
                <Text style={styles.viewMatchesText}>View All Matches</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  heartsContainer: {
    position: 'absolute',
    width: 200,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heart1: {
    position: 'absolute',
    left: 20,
    top: 40,
  },
  heart2: {
    position: 'absolute',
    right: 30,
    top: 20,
  },
  heart3: {
    position: 'absolute',
    left: 60,
    top: 10,
  },
  heart4: {
    position: 'absolute',
    right: 70,
    top: 50,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '85%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
    marginBottom: 24,
  },
  matchBadgeText: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#fff',
  },
  name: {
    fontSize: 48,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  keepSwipingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0a7ea4',
    gap: 8,
  },
  keepSwipingText: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#0a7ea4',
  },
  viewMatchesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  viewMatchesText: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#fff',
  },
});
