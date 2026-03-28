import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Fonts, THEME_META, CANDY_THEMES, type ThemeKey } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

const { width } = Dimensions.get('window');

// Onboarding-specific gradient backgrounds per theme (lighter/softer than app screenBg)
const ONBOARDING_BG: Record<ThemeKey, readonly [string, string, string]> = {
  pink: ['#FFF0F5', '#FFE4EC', '#F5E6FF'],
  mint: ['#F0FFF4', '#E4FFED', '#E6F5FF'],
  blue: ['#F0F5FF', '#E4ECFF', '#F5E6FF'],
  yellow: ['#FFFDF0', '#FFF8E1', '#FFF5E6'],
};

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

  return (
    <Pressable
      style={[
        styles.themeCard,
        isSelected && { borderColor: theme.primary },
      ]}
      onPress={onSelect}
    >
      <View style={styles.swatchWrap}>
        <LinearGradient
          colors={[...meta.previewColors]}
          style={styles.swatch}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        {isSelected && (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={14} color={theme.primary} />
          </View>
        )}
      </View>
      <Text style={styles.themeLabel}>
        {meta.emoji} {meta.name}
      </Text>
    </Pressable>
  );
}

function PreviewCard({ themeKey }: { themeKey: ThemeKey }) {
  const theme = CANDY_THEMES[themeKey];
  const meta = THEME_META.find((m) => m.key === themeKey)!;

  return (
    <View style={[styles.previewCard, { borderColor: theme.primary }]}>
      <Text style={styles.previewLabel}>Preview</Text>
      <Text style={styles.previewName}>Olivia</Text>
      <View style={[styles.previewUnderline, { backgroundColor: meta.previewColors[0] }]} />
      <View style={[styles.previewPill, { backgroundColor: theme.surfaceSubtle }]}>
        <Text style={styles.previewPillText}>{'\u{1F1EC}\u{1F1E7}'} English</Text>
      </View>
    </View>
  );
}

export function ThemePicker() {
  const { themeKey, setTheme } = useTheme();

  return (
    <View style={styles.container}>
      {/* Title */}
      <Animated.Text
        entering={FadeIn.delay(200).duration(400)}
        style={styles.title}
      >
        Pick Your Vibe
      </Animated.Text>

      {/* 2x2 theme grid */}
      <Animated.View
        entering={FadeIn.delay(300).duration(500)}
        style={styles.grid}
      >
        {(['pink', 'mint', 'blue', 'yellow'] as ThemeKey[]).map((key) => (
          <ThemeCard
            key={key}
            themeKey={key}
            isSelected={themeKey === key}
            onSelect={() => setTheme(key)}
          />
        ))}
      </Animated.View>

      {/* Preview mini-card */}
      <Animated.View
        entering={FadeIn.delay(500).duration(400)}
        style={styles.previewArea}
      >
        <PreviewCard themeKey={themeKey} />
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
    fontSize: 20,
    color: '#2D1B4E',
    textAlign: 'center',
    marginTop: 90,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
    marginTop: 28,
    paddingHorizontal: 24,
    width: '100%',
  },
  themeCard: {
    width: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
    borderWidth: 3,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
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
  previewArea: {
    marginTop: 24,
    paddingHorizontal: 24,
    width: '100%',
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
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
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
