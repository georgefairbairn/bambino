import { useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, FlatList, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';

const { width } = Dimensions.get('window');

interface OnboardingScreensProps {
  onComplete: () => void;
}

interface OnboardingSlide {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    icon: 'heart',
    iconColor: '#ef4444',
    iconBg: '#fef2f2',
    title: 'Welcome to Bambino',
    description:
      'Find the perfect baby name together with your partner through our fun swipe-based interface.',
  },
  {
    id: '2',
    icon: 'swap-horizontal',
    iconColor: '#0a7ea4',
    iconBg: '#e0f2fe',
    title: 'Swipe to Decide',
    description:
      "Swipe right on names you love, left on names you don't. Skip any name to come back later.",
  },
  {
    id: '3',
    icon: 'people',
    iconColor: '#8b5cf6',
    iconBg: '#f3e8ff',
    title: 'Sync with Partner',
    description:
      "Share your session code with your partner. When you both like the same name, it's a match!",
  },
  {
    id: '4',
    icon: 'trophy',
    iconColor: '#f59e0b',
    iconBg: '#fffbeb',
    title: 'Find Your Match',
    description:
      'Review your matches, add notes, rank favorites, and choose the perfect name together.',
  },
];

export function OnboardingScreens({ onComplete }: OnboardingScreensProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={styles.slide}>
      <View style={[styles.iconContainer, { backgroundColor: item.iconBg }]}>
        <Ionicons name={item.icon} size={80} color={item.iconColor} />
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {SLIDES.map((_, index) => {
        const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 24, 8],
          extrapolate: 'clamp',
        });

        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });

        return <Animated.View key={index} style={[styles.dot, { width: dotWidth, opacity }]} />;
      })}
    </View>
  );

  const isLastSlide = currentIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      {/* Skip button */}
      <Pressable style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        scrollEventThrottle={16}
      />

      {/* Pagination dots */}
      {renderDots()}

      {/* Next/Get Started button */}
      <Pressable style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextText}>{isLastSlide ? 'Get Started' : 'Next'}</Text>
        {!isLastSlide && <Ionicons name="arrow-forward" size={20} color="#fff" />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#C6E7F5',
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    color: '#6b7280',
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 120,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 17,
    fontFamily: Fonts?.sans,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 26,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0a7ea4',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a7ea4',
    marginHorizontal: 40,
    marginBottom: 50,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  nextText: {
    fontSize: 18,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#fff',
  },
});
