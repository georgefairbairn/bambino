import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Fonts, THEME_META, CANDY_THEMES, type ThemeKey } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

const SPRING_CONFIG = { damping: 20, stiffness: 200 };
const COLOR_TIMING = { duration: 350, easing: Easing.out(Easing.cubic) };

function ThemeCard({
  themeKey,
  isSelected,
  onSelect,
}: {
  themeKey: ThemeKey;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const meta = THEME_META.find((m) => m.key === themeKey)!;
  const theme = CANDY_THEMES[themeKey];

  const selected = useSharedValue(isSelected ? 1 : 0);
  const checkScale = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    selected.value = withTiming(isSelected ? 1 : 0, COLOR_TIMING);
    checkScale.value = isSelected ? withSpring(1, SPRING_CONFIG) : withTiming(0, { duration: 200 });
  }, [isSelected]); // eslint-disable-line react-hooks/exhaustive-deps

  const cardBorderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(selected.value, [0, 1], ['transparent', theme.primary]),
    transform: [{ scale: withSpring(isSelected ? 1 : 0.97, SPRING_CONFIG) }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  return (
    <Animated.View style={[styles.themeCard, cardBorderStyle]}>
      <Pressable style={styles.themeCardInner} onPress={onSelect}>
        <View style={styles.swatchWrap}>
          <LinearGradient
            colors={[...meta.previewColors]}
            style={styles.swatch}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Animated.View style={[styles.checkBadge, checkStyle]}>
            <Ionicons name="checkmark" size={14} color={theme.primary} />
          </Animated.View>
        </View>
        <Text style={styles.themeLabel}>
          {meta.emoji} {meta.name}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function PreviewCard({ themeKey }: { themeKey: ThemeKey }) {
  const theme = CANDY_THEMES[themeKey];
  const meta = THEME_META.find((m) => m.key === themeKey)!;

  const progress = useSharedValue(0);
  const contentOpacity = useSharedValue(1);

  useEffect(() => {
    contentOpacity.value = withTiming(0.4, { duration: 120 }, () => {
      contentOpacity.value = withTiming(1, { duration: 280 });
    });
    progress.value = 0;
    progress.value = withTiming(1, COLOR_TIMING);
  }, [themeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(progress.value, [0, 1], ['rgba(200,200,200,0.3)', theme.primary]),
  }));

  const contentFade = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  return (
    <Animated.View style={[styles.previewCard, borderStyle]}>
      <Animated.View style={contentFade}>
        <Text style={styles.previewLabel}>Preview</Text>
        <Text style={styles.previewName}>Olivia</Text>
        <View style={[styles.previewUnderline, { backgroundColor: meta.previewColors[0] }]} />
        <Text style={styles.previewDescription}>A classic name meaning &quot;olive tree&quot;</Text>
        <View style={[styles.previewPill, { backgroundColor: theme.surfaceSubtle }]}>
          <Text style={styles.previewPillText}>{'\u{1F1EC}\u{1F1E7}'} English</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

export function ThemePickerSection() {
  const { themeKey, setTheme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  useFocusEffect(useCallback(() => {
    return () => setIsExpanded(false);
  }, []));

  const currentMeta = THEME_META.find((t) => t.key === themeKey)!;

  return (
    <View style={styles.container}>
      <Pressable style={styles.headerRow} onPress={() => setIsExpanded(!isExpanded)}>
        <Ionicons name="color-palette-outline" size={22} color="#6B5B7B" style={{ marginRight: 12 }} />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Theme</Text>
          <Text style={styles.headerSubtitle}>
            {currentMeta.emoji} {currentMeta.name}
          </Text>
        </View>
        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={22} color="#A89BB5" />
      </Pressable>

      {isExpanded && (
        <View style={styles.expandedContent}>
          <View style={styles.grid}>
            {(['pink', 'mint', 'blue', 'yellow'] as ThemeKey[]).map((key) => (
              <ThemeCard
                key={key}
                themeKey={key}
                isSelected={themeKey === key}
                onSelect={() => setTheme(key)}
              />
            ))}
          </View>
          <PreviewCard themeKey={themeKey} />
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
    gap: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
  },
  themeCard: {
    width: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  themeCardInner: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  swatchWrap: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: 46,
    height: 46,
    borderRadius: 23,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  checkBadge: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D1B4E',
    textAlign: 'center',
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: '#A89BB5',
    marginBottom: 8,
  },
  previewName: {
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    fontSize: 24,
    color: '#2D1B4E',
    marginBottom: 4,
  },
  previewUnderline: {
    width: 50,
    height: 3,
    borderRadius: 2,
    marginBottom: 8,
  },
  previewDescription: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B5B7B',
    marginBottom: 10,
    lineHeight: 18,
  },
  previewPill: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  previewPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2D1B4E',
  },
});
