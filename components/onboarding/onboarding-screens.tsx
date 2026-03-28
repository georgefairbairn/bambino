import { useState, useRef, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Fonts } from '@/constants/theme';
import { WelcomeSplash } from './welcome-splash';
import { SwipeDemo } from './swipe-demo';
import { MultiplayerIntro } from './multiplayer-intro';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TOTAL_SCREENS = 3;

interface OnboardingScreensProps {
  onComplete: () => void;
}

const SCREENS = [
  { id: '1', component: WelcomeSplash },
  { id: '2', component: SwipeDemo },
  { id: '3', component: MultiplayerIntro },
];

export function OnboardingScreens({ onComplete }: OnboardingScreensProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

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
    return (
      <View style={styles.screenWrapper}>
        <Screen />
      </View>
    );
  }, []);

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#F0FDF4', '#D1FAE5', '#ECFDF5']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

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
            colors={['#6EE7B7', '#34D399']}
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
  screenWrapper: {
    width: SCREEN_WIDTH,
    flex: 1,
    overflow: 'hidden',
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
