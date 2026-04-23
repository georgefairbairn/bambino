import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { useSkinTone } from '@/contexts/skin-tone-context';
import { SKIN_TONE_OPTIONS, getGenderEmoji, type SkinToneKey } from '@/constants/skin-tone';

const SPRING_CONFIG = { damping: 20, stiffness: 200 };
const COLOR_TIMING = { duration: 350, easing: Easing.out(Easing.cubic) };

function SkinToneCard({
  toneKey,
  isSelected,
  onSelect,
  primaryColor,
}: {
  toneKey: SkinToneKey;
  isSelected: boolean;
  onSelect: () => void;
  primaryColor: string;
}) {
  const babyEmoji = getGenderEmoji('neutral', toneKey);

  const selected = useSharedValue(isSelected ? 1 : 0);
  const checkScale = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    selected.value = withTiming(isSelected ? 1 : 0, COLOR_TIMING);
    checkScale.value = isSelected ? withSpring(1, SPRING_CONFIG) : withTiming(0, { duration: 200 });
  }, [isSelected]); // eslint-disable-line react-hooks/exhaustive-deps

  const cardBorderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(selected.value, [0, 1], ['transparent', primaryColor]),
    transform: [{ scale: withSpring(isSelected ? 1 : 0.97, SPRING_CONFIG) }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  return (
    <Animated.View style={[styles.toneCard, cardBorderStyle]}>
      <Pressable style={styles.toneCardInner} onPress={onSelect}>
        <View style={styles.emojiWrap}>
          <Text style={styles.toneEmoji}>{babyEmoji}</Text>
          <Animated.View style={[styles.checkBadge, checkStyle]}>
            <Ionicons name="checkmark" size={12} color={primaryColor} />
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function SkinToneSection() {
  const { skinTone, setSkinTone } = useSkinTone();
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  useFocusEffect(useCallback(() => {
    return () => setIsExpanded(false);
  }, []));

  const currentEmoji = getGenderEmoji('neutral', skinTone);

  return (
    <View style={styles.container}>
      <Pressable style={styles.headerRow} onPress={() => setIsExpanded(!isExpanded)}>
        <Ionicons
          name="hand-left-outline"
          size={22}
          color="#6B5B7B"
          style={{ marginRight: 12 }}
        />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Skin Tone</Text>
          <Text style={styles.headerSubtitle}>
            {currentEmoji}
          </Text>
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color="#A89BB5"
        />
      </Pressable>

      {isExpanded && (
        <View style={styles.expandedContent}>
          <View style={styles.grid}>
            {SKIN_TONE_OPTIONS.map((option) => (
              <SkinToneCard
                key={option.key}
                toneKey={option.key}
                isSelected={skinTone === option.key}
                onSelect={() => setSkinTone(option.key)}
                primaryColor={colors.primary}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#2D1B4E',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    marginTop: 4,
  },
  expandedContent: {
    marginTop: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  toneCard: {
    width: '30%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 3,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  toneCardInner: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 6,
  },
  emojiWrap: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toneEmoji: {
    fontSize: 32,
  },
  checkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
});
