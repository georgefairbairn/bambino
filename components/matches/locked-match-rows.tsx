import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

interface LockedMatchRowsProps {
  /** Number of locked (inaccessible) matches. One blurred row is drawn per match. */
  count: number;
  /** Called when the user taps a locked row. Opens the paywall sheet. */
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
  { name: 'Mia', origin: 'Scandinavian' },
  { name: 'Theodore', origin: 'Greek' },
  { name: 'Amelia', origin: 'Germanic' },
  { name: 'Rafael', origin: 'Hebrew' },
  { name: 'Nora', origin: 'Irish' },
  { name: 'Julian', origin: 'Latin' },
  { name: 'Beatrice', origin: 'Latin' },
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
export function LockedMatchRows({ count, onPress }: LockedMatchRowsProps) {
  const { colors } = useTheme();
  const label = `Unlock ${count} more ${count === 1 ? 'match' : 'matches'}`;
  // One row per locked match. Filler cycles once a couple has more locked
  // matches than the list has entries.
  const rows = Array.from({ length: count }, (_, i) => FILLER_ROWS[i % FILLER_ROWS.length]!);

  return (
    <View>
      {rows.map((filler, i) => (
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
});
