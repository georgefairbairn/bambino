import { useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, FlatList, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Fonts, THEME_META } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { GradientBackground } from '@/components/ui/gradient-background';
import { GradientButton } from '@/components/ui/gradient-button';

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
  type?: 'default' | 'theme';
}

const SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    icon: 'heart',
    iconColor: '#FF5C8A',
    iconBg: '#FFE4EC',
    title: 'Welcome to Bambino',
    description:
      'Find the perfect baby name together with your partner through our fun swipe-based interface.',
  },
  {
    id: '2',
    icon: 'swap-horizontal',
    iconColor: '#A78BFA',
    iconBg: '#F3E8FF',
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
      "Link your accounts in Profile using your share code. When you both like the same name, it's a match!",
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
  {
    id: '5',
    icon: 'color-palette',
    iconColor: '#FF5C8A',
    iconBg: '#FFE4EC',
    title: 'Choose Your Style',
    description: 'Pick a color theme that feels like you.',
    type: 'theme',
  },
];

function ThemeGrid() {
  const { themeKey, setTheme } = useTheme();

  return (
    <View style={styles.themeGrid}>
      {THEME_META.map((meta) => {
        const isSelected = meta.key === themeKey;
        return (
          <Pressable key={meta.key} style={styles.themeGridItem} onPress={() => setTheme(meta.key)}>
            <LinearGradient
              colors={[...meta.previewColors]}
              style={[styles.themeGridSwatch, isSelected && styles.themeGridSwatchSelected]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {isSelected && <Ionicons name="checkmark" size={28} color="#fff" />}
            </LinearGradient>
            <Text style={[styles.themeGridLabel, isSelected && styles.themeGridLabelSelected]}>
              {meta.emoji} {meta.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

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
      {item.type === 'theme' && <ThemeGrid />}
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
    <GradientBackground>
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
      <View style={styles.nextButtonContainer}>
        <GradientButton
          title={isLastSlide ? 'Get Started' : 'Next'}
          onPress={handleNext}
          variant="primary"
          icon={isLastSlide ? undefined : 'arrow-forward'}
        />
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
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
    color: '#6B5B7B',
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
    color: '#2D1B4E',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 17,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
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
    backgroundColor: '#2D1B4E',
  },
  nextButtonContainer: {
    marginHorizontal: 40,
    marginBottom: 50,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginTop: 24,
    width: '100%',
  },
  themeGridItem: {
    alignItems: 'center',
    width: '40%',
    gap: 8,
  },
  themeGridSwatch: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  themeGridSwatchSelected: {
    borderColor: '#2D1B4E',
  },
  themeGridLabel: {
    fontSize: 15,
    fontFamily: Fonts?.sans,
    fontWeight: '500',
    color: '#6B5B7B',
  },
  themeGridLabelSelected: {
    color: '#2D1B4E',
    fontWeight: '700',
  },
});
