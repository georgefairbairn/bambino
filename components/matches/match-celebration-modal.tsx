import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Doc } from '@/convex/_generated/dataModel';
import { CARD_WIDTH, CARD_HEIGHT_FULL, SCREEN_HEIGHT } from '@/constants/swipe';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { Confetti } from '@/components/ui/confetti';
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
  const { colors } = useTheme();

  // Overlay fade
  const overlayOpacity = useSharedValue(0);
  // Card slides in from above the screen
  const contentTranslateY = useSharedValue(-SCREEN_HEIGHT);
  const contentOpacity = useSharedValue(0);
  // Staggered elements
  const bannerScale = useSharedValue(0.5);
  const bannerOpacity = useSharedValue(0);
  const nameOpacity = useSharedValue(0);
  const nameSlideY = useSharedValue(16);
  const descOpacity = useSharedValue(0);
  const buttonsOpacity = useSharedValue(0);
  const buttonsSlideY = useSharedValue(16);

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Background overlay
      overlayOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });

      // Card slides down from top
      contentOpacity.value = withTiming(1, { duration: 200 });
      contentTranslateY.value = withSpring(0, { damping: 16, stiffness: 120 });

      // Staggered elements (after card lands)
      bannerScale.value = withDelay(250, withSpring(1, { damping: 10, stiffness: 200 }));
      bannerOpacity.value = withDelay(250, withTiming(1, { duration: 200 }));

      nameOpacity.value = withDelay(400, withTiming(1, { duration: 300 }));
      nameSlideY.value = withDelay(400, withSpring(0, { damping: 14, stiffness: 150 }));

      descOpacity.value = withDelay(550, withTiming(1, { duration: 300 }));

      buttonsOpacity.value = withDelay(650, withTiming(1, { duration: 300 }));
      buttonsSlideY.value = withDelay(650, withSpring(0, { damping: 14, stiffness: 150 }));
    } else {
      // Reset all values
      overlayOpacity.value = 0;
      contentTranslateY.value = -SCREEN_HEIGHT;
      contentOpacity.value = 0;
      bannerScale.value = 0.5;
      bannerOpacity.value = 0;
      nameOpacity.value = 0;
      nameSlideY.value = 16;
      descOpacity.value = 0;
      buttonsOpacity.value = 0;
      buttonsSlideY.value = 16;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentTranslateY.value }],
    opacity: contentOpacity.value,
  }));

  const bannerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bannerScale.value }],
    opacity: bannerOpacity.value,
  }));

  const nameStyle = useAnimatedStyle(() => ({
    opacity: nameOpacity.value,
    transform: [{ translateY: nameSlideY.value }],
  }));

  const descStyle = useAnimatedStyle(() => ({
    opacity: descOpacity.value,
  }));

  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsSlideY.value }],
  }));

  if (!visible || !name) return null;

  return (
    <>
      <Confetti visible={visible} />

      {/* Semi-transparent backdrop over the card */}
      <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="box-none">
        {/* Card-sized container positioned to cover the swipe card */}
        <Animated.View style={[styles.card, { borderColor: colors.primary }, contentStyle]}>
          <View style={styles.content}>
            {/* Match banner */}
            <Animated.View
              style={[
                styles.banner,
                { borderColor: colors.primary, backgroundColor: colors.secondaryLight },
                bannerStyle,
              ]}
            >
              <Text style={[styles.bannerText, { color: colors.tabActive }]}>
                {"It's a Match!"}
              </Text>
            </Animated.View>

            {/* Name */}
            <Animated.Text style={[styles.name, nameStyle]}>{name.name}</Animated.Text>

            {/* Description */}
            <Animated.Text style={[styles.description, descStyle]}>
              {"You and your partner both love this name \u2014 it's on your shortlist!"}
            </Animated.Text>

            {/* Buttons */}
            <Animated.View style={[styles.buttons, buttonsStyle]}>
              <Pressable
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  onClose();
                  onViewMatches?.();
                }}
              >
                <Text style={styles.primaryButtonText}>View Matches</Text>
              </Pressable>

              <Pressable
                style={[styles.secondaryButton, { borderColor: colors.primary }]}
                onPress={onClose}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                  Keep Swiping
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        </Animated.View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT_FULL,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 5,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 3,
    paddingHorizontal: 24,
    paddingVertical: 12,
    shadowColor: '#FF5C8A',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  bannerText: {
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    fontWeight: '800',
    fontSize: 20,
  },
  name: {
    fontSize: 46,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#2D1B4E',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
  },
});
