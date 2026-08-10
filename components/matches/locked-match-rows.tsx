import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { BUTTON_TEXT, Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

interface LockedMatchRowsProps {
  /** Number of locked (inaccessible) matches. */
  count: number;
  /** Total matches, locked + visible. Used for the CTA label. */
  total: number;
  /** Called when the user taps a locked row or the CTA. Opens the paywall sheet. */
  onPress: () => void;
}

/**
 * Filler used *underneath* the blur so the rows read as real name rows rather
 * than as a loading skeleton — blurred text has irregular density that solid
 * grey bars can't fake.
 *
 * These are NOT the user's locked matches, and must never become them. The
 * server deliberately does not send locked names to the client; blurring real
 * names here would mean shipping them over the wire, where anyone can read them
 * off the network and the paywall stops meaning anything.
 */
const FILLER_ROWS = [
  { name: 'Alexander', origin: 'Greek' },
  { name: 'Isabella', origin: 'Italian' },
  { name: 'Sebastian', origin: 'Latin' },
] as const;

/**
 * Blurred stand-ins for the matches a free user can't see yet, plus a CTA that
 * opens the paywall. Mirrors MatchCard's geometry so a locked row reads as the
 * same kind of object as the real match above it.
 *
 * Note the structure: every Pressable here is a bare hit target with the visual
 * styling on an inner View. Putting card styles in a Pressable `style` callback
 * left them unapplied at runtime — the cards rendered with no background, no
 * margins and no row layout.
 */
export function LockedMatchRows({ count, total, onPress }: LockedMatchRowsProps) {
  const { colors } = useTheme();
  const visibleRows = Math.min(count, FILLER_ROWS.length);
  const overflow = count - visibleRows;
  const label = `Unlock ${count} more ${count === 1 ? 'match' : 'matches'}`;

  return (
    <View>
      {FILLER_ROWS.slice(0, visibleRows).map((filler, i) => (
        <Pressable key={i} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
          <View style={[styles.card, { shadowColor: colors.secondary }]}>
            <View style={styles.mainContent}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{filler.name}</Text>
              </View>
              <View style={styles.metaRow}>
                <View style={[styles.originBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.originText, { color: colors.primary }]}>
                    {filler.origin}
                  </Text>
                </View>
                <Text style={styles.timestamp}>Matched recently</Text>
              </View>
            </View>

            {/* Sits above the content and below the lock. pointerEvents none so
                it can't swallow the row's press. */}
            <BlurView
              intensity={18}
              tint="light"
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            <View style={[styles.lockBadge, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="lock-closed" size={16} color={colors.primary} />
            </View>
          </View>
        </Pressable>
      ))}

      {overflow > 0 && <Text style={styles.overflowLabel}>and {overflow} more</Text>}

      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
        <View style={[styles.ctaButton, { backgroundColor: colors.primary }]}>
          <Text style={[BUTTON_TEXT.cta, styles.ctaText]}>See All {total} Matches</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Mirrors MatchCard.card so a locked row reads as the same object as a real one.
  card: {
    backgroundColor: '#FFF8FA',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  mainContent: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  name: {
    fontSize: 24,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#2D1B4E',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  originBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  originText: {
    fontSize: 12,
    fontFamily: Fonts?.sans,
  },
  timestamp: {
    fontSize: 12,
    fontFamily: Fonts?.sans,
    color: '#A89BB5',
  },
  lockBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overflowLabel: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    textAlign: 'center',
    marginBottom: 16,
  },
  ctaButton: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  ctaText: {
    color: '#fff',
  },
});
