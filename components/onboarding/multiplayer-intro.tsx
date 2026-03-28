import { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Extrapolation,
  FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';

const { width } = Dimensions.get('window');

const LOOP_DURATION = 5000;

export function MultiplayerIntro() {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: LOOP_DURATION }), -1, false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Card animations ──────────────────────────────────────────────
  // Timeline (5s): Slide together 0-10% | Banner pop 10-16% |
  //   Hold 3s 16-76% | Dismiss + apart 76-86% | Rest 86-100%
  // Cards stay visible the whole time (no fade out/in)
  const youCardStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const translateX = interpolate(
      p,
      [0, 0.10, 0.76, 0.86, 1.0],
      [-30, 0, 0, -30, -30],
      Extrapolation.CLAMP,
    );
    const rotate = interpolate(
      p,
      [0, 0.10, 0.76, 0.86, 1.0],
      [-3, 0, 0, -3, -3],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ rotate: `${rotate}deg` }, { translateX }],
    };
  });

  const partnerCardStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const translateX = interpolate(
      p,
      [0, 0.10, 0.76, 0.86, 1.0],
      [30, 0, 0, 30, 30],
      Extrapolation.CLAMP,
    );
    const rotate = interpolate(
      p,
      [0, 0.10, 0.76, 0.86, 1.0],
      [3, 0, 0, 3, 3],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ rotate: `${rotate}deg` }, { translateX }],
    };
  });

  // ── Match banner animation ───────────────────────────────────────
  // Appears after cards meet, holds for ~3s (16-76% of 5s = 3s)
  const bannerStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const scale = interpolate(
      p,
      [0, 0.10, 0.14, 0.16, 0.76, 0.84, 1.0],
      [0, 0, 1.08, 1, 1, 0, 0],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      p,
      [0, 0.10, 0.14, 0.76, 0.84, 1.0],
      [0, 0, 1, 1, 0, 0],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <View style={styles.container}>
      {/* Title */}
      <Animated.Text entering={FadeIn.delay(200).duration(400)} style={styles.title}>
        Join Your Partner
      </Animated.Text>

      {/* PRO pill */}
      <Animated.View entering={FadeIn.delay(300).duration(400)} style={styles.proPillWrap}>
        <LinearGradient
          colors={['#FEF3C7', '#FFFBEB']}
          style={styles.proPill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.proPillText}>{'\u2B50'} PRO</Text>
        </LinearGradient>
      </Animated.View>

      {/* Match animation area */}
      <View style={styles.matchStage}>
        {/* YOU card */}
        <Animated.View style={[styles.miniCard, styles.cardYou, youCardStyle]}>
          <Text style={styles.miniCardLabel}>YOU</Text>
          <Text style={styles.miniCardName}>Luna</Text>
          <View style={styles.stamp}>
            <Ionicons name="heart" size={14} color="#34C77B" />
            <Text style={styles.stampText}>LIKE</Text>
          </View>
        </Animated.View>

        {/* PARTNER card */}
        <Animated.View style={[styles.miniCard, styles.cardPartner, partnerCardStyle]}>
          <Text style={styles.miniCardLabel}>PARTNER</Text>
          <Text style={styles.miniCardName}>Luna</Text>
          <View style={styles.stamp}>
            <Ionicons name="heart" size={14} color="#34C77B" />
            <Text style={styles.stampText}>LIKE</Text>
          </View>
        </Animated.View>

        {/* Match banner */}
        <Animated.View style={[styles.matchBanner, bannerStyle]}>
          <Text style={styles.matchEmoji}>{'\uD83C\uDF89'}</Text>
          <Text style={styles.matchText}>It&apos;s a Match!</Text>
        </Animated.View>
      </View>

      {/* Three-step explainer */}
      <Animated.View entering={FadeIn.delay(500).duration(400)} style={styles.explainer}>
        <View style={styles.step}>
          <View style={styles.stepNum}>
            <Text style={styles.stepNumText}>1</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Swipe at your own pace</Text>
            <Text style={styles.stepDesc}>Each of you browses names and likes your favorites</Text>
          </View>
        </View>

        <View style={styles.stepDivider} />

        <View style={styles.step}>
          <View style={styles.stepNum}>
            <Text style={styles.stepNumText}>2</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Find common ground</Text>
            <Text style={styles.stepDesc}>
              Love the same name? It&apos;s added to your shared list
            </Text>
          </View>
        </View>

        <View style={styles.stepDivider} />

        <View style={styles.step}>
          <View style={styles.stepNum}>
            <Text style={styles.stepNumText}>3</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Pick the one</Text>
            <Text style={styles.stepDesc}>
              Review your matches together and choose your favorite
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    fontSize: 24,
    color: '#2D1B4E',
    textAlign: 'center',
    marginTop: 76,
  },
  proPillWrap: {
    marginTop: 8,
  },
  proPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  proPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.8,
  },

  // ── Match animation stage ──
  matchStage: {
    width: '100%',
    height: 180,
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniCard: {
    position: 'absolute',
    width: 116,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 4,
    borderColor: '#34D399',
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardYou: {
    left: width / 2 - 128,
  },
  cardPartner: {
    right: width / 2 - 128,
  },
  miniCardLabel: {
    fontSize: 10,
    color: '#A89BB5',
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  miniCardName: {
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    fontSize: 22,
    color: '#2D1B4E',
    marginBottom: 8,
  },
  stamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 3,
    borderColor: '#34C77B',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  stampText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#34C77B',
    letterSpacing: 2,
  },

  // ── Match banner ──
  matchBanner: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#F59E0B',
    paddingHorizontal: 28,
    paddingVertical: 14,
    zIndex: 10,
    shadowColor: '#F59E0B',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    backgroundColor: '#FFFBEB',
  },
  matchEmoji: {
    fontSize: 20,
  },
  matchText: {
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    fontSize: 18,
    color: '#D97706',
  },

  // ── Three-step explainer ──
  explainer: {
    width: '100%',
    paddingHorizontal: 28,
    marginTop: 24,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
  },
  stepDivider: {
    height: 1,
    backgroundColor: 'rgba(45, 27, 78, 0.06)',
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2D1B4E',
    lineHeight: 22,
  },
  stepDesc: {
    fontSize: 15,
    fontWeight: '400',
    color: '#6B5B7B',
    lineHeight: 21,
    marginTop: 3,
    fontFamily: Fonts?.sans,
  },
});
