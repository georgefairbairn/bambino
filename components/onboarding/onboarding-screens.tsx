import { useState, useRef, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { WelcomeSplash } from './welcome-splash';
import { SwipeDemo } from './swipe-demo';
import { ThemePicker } from './theme-picker';

const { width } = Dimensions.get('window');
const TOTAL_SCREENS = 3;

interface OnboardingScreensProps {
  onComplete: () => void;
}

const SCREENS = [
  { id: '1', component: WelcomeSplash },
  { id: '2', component: SwipeDemo },
  { id: '3', component: ThemePicker },
];

export function OnboardingScreens({ onComplete }: OnboardingScreensProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const { gradients } = useTheme();

  const handleNext = useCallback(() => {
    if (currentIndex < TOTAL_SCREENS - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete();
    }
  }, [currentIndex, onComplete]);

  const isLastScreen = currentIndex === TOTAL_SCREENS - 1;

  const renderScreen = useCallback(({ item }: { item: (typeof SCREENS)[number] }) => {
    const Screen = item.component;
    return <Screen />;
  }, []);

  return (
    <View style={styles.container}>
      {/* Background gradient — uses current theme */}
      <LinearGradient
        colors={[...gradients.screenBg]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      {/* Skip button */}
      <Pressable style={styles.skipButton} onPress={onComplete} hitSlop={12}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      {/* Screen carousel */}
      <FlatList
        ref={flatListRef}
        data={SCREENS}
        renderItem={renderScreen}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        scrollEnabled={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      />

      {/* Bottom area: dots + button */}
      <View style={styles.bottomArea}>
        {/* Pagination dots */}
        <View style={styles.dotsRow}>
          {Array.from({ length: TOTAL_SCREENS }).map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentIndex ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>

        {/* Next / Get Started button */}
        <Pressable onPress={handleNext}>
          <LinearGradient
            colors={[...gradients.buttonPrimary]}
            style={styles.ctaButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.ctaText}>{isLastScreen ? 'Get Started' : 'Next'}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
  },
  bottomArea: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2D1B4E',
  },
  dotActive: {
    width: 20,
    opacity: 1,
  },
  dotInactive: {
    width: 6,
    opacity: 0.25,
  },
  ctaButton: {
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 14,
    minWidth: 220,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts?.sans,
  },
});
