import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

const LOOP_DURATION = 5000;

export function MatchAnimation() {
  const { colors } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withRepeat(withTiming(1, { duration: LOOP_DURATION }), -1, false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const youCardStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const translateX = interpolate(
      p,
      [0, 0.1, 0.76, 0.86, 1.0],
      [-70, 0, 0, -70, -70],
      Extrapolation.CLAMP,
    );
    const rotate = interpolate(
      p,
      [0, 0.1, 0.76, 0.86, 1.0],
      [-6, 0, 0, -6, -6],
      Extrapolation.CLAMP,
    );
    return { transform: [{ rotate: `${rotate}deg` }, { translateX }] };
  });

  const partnerCardStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const translateX = interpolate(
      p,
      [0, 0.1, 0.76, 0.86, 1.0],
      [70, 0, 0, 70, 70],
      Extrapolation.CLAMP,
    );
    const rotate = interpolate(
      p,
      [0, 0.1, 0.76, 0.86, 1.0],
      [6, 0, 0, 6, 6],
      Extrapolation.CLAMP,
    );
    return { transform: [{ rotate: `${rotate}deg` }, { translateX }] };
  });

  const bannerStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const scale = interpolate(
      p,
      [0, 0.1, 0.14, 0.16, 0.76, 0.84, 1.0],
      [0, 0, 1.08, 1, 1, 0, 0],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      p,
      [0, 0.1, 0.14, 0.76, 0.84, 1.0],
      [0, 0, 1, 1, 0, 0],
      Extrapolation.CLAMP,
    );
    return { transform: [{ scale }], opacity };
  });

  return (
    <View style={styles.matchStage}>
      <Animated.View style={[styles.miniCard, styles.cardYou, youCardStyle]}>
        <Text style={styles.miniCardLabel}>YOU</Text>
        <Text style={styles.miniCardName}>Luna</Text>
        <View style={styles.stamp}>
          <Ionicons name="heart" size={14} color="#34C77B" />
          <Text style={styles.stampText}>LIKE</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.miniCard, styles.cardPartner, partnerCardStyle]}>
        <Text style={styles.miniCardLabel}>PARTNER</Text>
        <Text style={styles.miniCardName}>Luna</Text>
        <View style={styles.stamp}>
          <Ionicons name="heart" size={14} color="#34C77B" />
          <Text style={styles.stampText}>LIKE</Text>
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.matchBanner,
          {
            borderColor: colors.primary,
            shadowColor: colors.primary,
            backgroundColor: colors.secondaryLight,
          },
          bannerStyle,
        ]}
      >
        <Text style={styles.matchEmoji}>{'\uD83C\uDF89'}</Text>
        <Text style={[styles.matchText, { color: colors.tabActive }]}>It&apos;s a Match!</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  matchStage: {
    width: '100%',
    height: 180,
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
    left: '50%',
    marginLeft: -58,
  },
  cardPartner: {
    left: '50%',
    marginLeft: -58,
  },
  miniCardLabel: {
    fontSize: 10,
    color: '#A89BB5',
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  miniCardName: {
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
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
  matchBanner: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 3,
    paddingHorizontal: 28,
    paddingVertical: 14,
    zIndex: 10,
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  matchEmoji: {
    fontSize: 20,
  },
  matchText: {
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    fontSize: 18,
  },
});
