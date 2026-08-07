import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { DimensionValue } from 'react-native';
import { BlurView } from 'expo-blur';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

interface LockedMatchRowsProps {
  /** Total number of locked (inaccessible) matches. */
  count: number;
  /** Called when the user taps any part of the block. */
  onPress: () => void;
}

// Varying widths so rows read as different redacted names, not identical blanks.
const PLACEHOLDER_WIDTHS: readonly { name: DimensionValue; sub: DimensionValue }[] = [
  { name: '52%', sub: '38%' },
  { name: '40%', sub: '46%' },
  { name: '58%', sub: '34%' },
];

/**
 * Renders up to 3 blurred placeholder cards representing locked matches,
 * plus a "… N more" label when count > 3. The whole block is pressable.
 *
 * IMPORTANT: these cards contain only generic placeholder text — never real
 * name data. The server does not send locked match names to the client, and
 * it must stay that way. Do not add queries or props that surface locked names.
 */
export function LockedMatchRows({ count, onPress }: LockedMatchRowsProps) {
  const { colors } = useTheme();
  const visibleRows = Math.min(count, 3);
  const overflow = count > 3 ? count - 3 : 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Unlock ${count} more ${count === 1 ? 'match' : 'matches'}`}
    >
      {Array.from({ length: visibleRows }).map((_, i) => (
        <View key={i} style={[styles.cardWrapper, { shadowColor: colors.secondary }]}>
          {/* Placeholder lines underneath the blur — generic widths only, no real data */}
          <View style={styles.placeholderContent}>
            <View style={[styles.placeholderNameLine, { width: PLACEHOLDER_WIDTHS[i]!.name }]} />
            <View style={[styles.placeholderSubLine, { width: PLACEHOLDER_WIDTHS[i]!.sub }]} />
          </View>
          {/* Blur overlay — covers the placeholder so no text is readable */}
          <BlurView intensity={22} tint="light" style={StyleSheet.absoluteFill} />
        </View>
      ))}

      {overflow > 0 && <Text style={styles.overflowLabel}>… {overflow} more</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    backgroundColor: '#FFF8FA',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
    // Mirror the real MatchCard shadow (shadowColor comes from the theme)
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  placeholderContent: {
    padding: 16,
    gap: 10,
  },
  placeholderNameLine: {
    height: 20,
    backgroundColor: '#E8E0EE',
    borderRadius: 6,
  },
  placeholderSubLine: {
    height: 14,
    backgroundColor: '#EDE8F2',
    borderRadius: 4,
  },
  overflowLabel: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    textAlign: 'center',
    marginBottom: 16,
  },
});
