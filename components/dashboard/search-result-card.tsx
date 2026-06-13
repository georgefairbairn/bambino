import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { getOriginFlag } from '@/constants/origins';
import { useTheme } from '@/contexts/theme-context';
import { useSkinTone } from '@/contexts/skin-tone-context';
import { getGenderEmoji } from '@/constants/skin-tone';
import { Doc } from '@/convex/_generated/dataModel';

interface SearchResultCardProps {
  name: Doc<'names'>;
  /** Which sub-tab is active — decides the in-list action set. */
  tab: 'liked' | 'rejected';
  /** Whether the name is already in the list of the active sub-tab. */
  inThisTab: boolean;
  /**
   * Set when the name is in the *other* sub-tab (e.g. "In Rejected" while
   * viewing Liked). Surfaced as a muted hint so the user knows adding it will
   * move the name across lists rather than add it fresh.
   */
  otherTabLabel?: string | null;
  /** Tap the row body → open the read-only detail sheet. */
  onPress: () => void;
  /** Tap the ＋ → add to the active list. */
  onAdd: () => void;
  /** Liked tab, already liked: 🗑 → remove (handler confirms first). */
  onRemove: () => void;
  /** Rejected tab, already rejected: restore → back to queue (confirms first). */
  onRestore: () => void;
  /** Rejected tab, already rejected: hide → permanently (confirms first). */
  onHide: () => void;
}

// Intentionally NOT memoized. The add flow writes optimistic state in two
// phases (selectionType first, then the resolved selectionId), and the second
// write changes neither inThisTab nor otherTabLabel — a memo comparator would
// skip it and freeze a stale onRemove that never sees the selectionId. The
// search list is capped at SEARCH_RESULT_LIMIT rows, so re-rendering is cheap.
export function SearchResultCard({
  name,
  tab,
  inThisTab,
  otherTabLabel,
  onPress,
  onAdd,
  onRemove,
  onRestore,
  onHide,
}: SearchResultCardProps) {
  const { colors } = useTheme();
  const { skinTone } = useSkinTone();
  const genderEmoji = getGenderEmoji(name.gender, skinTone);

  return (
    <Pressable
      style={[styles.card, { shadowColor: colors.secondary }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View ${name.name}`}
    >
      <View style={styles.mainContent}>
        <View style={styles.nameRow}>
          <Text style={styles.genderEmoji}>{genderEmoji}</Text>
          <Text style={styles.name}>{name.name}</Text>
        </View>

        <View style={styles.metaRow}>
          <View style={[styles.originBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.originText, { color: colors.primary }]}>
              {getOriginFlag(name.origin)} {name.origin}
            </Text>
          </View>
          {otherTabLabel && <Text style={styles.stateHint}>{otherTabLabel}</Text>}
        </View>
      </View>

      {!inThisTab ? (
        <Pressable
          style={styles.actionButton}
          onPress={onAdd}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Add ${name.name}`}
        >
          <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
        </Pressable>
      ) : tab === 'liked' ? (
        <Pressable
          style={styles.actionButton}
          onPress={onRemove}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${name.name}`}
        >
          <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
        </Pressable>
      ) : (
        // Already rejected: mirror RejectedNameCard — Restore + Hide.
        <View style={styles.actionRow}>
          <Pressable
            style={styles.actionButton}
            onPress={onRestore}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Restore ${name.name}`}
          >
            <Ionicons name="refresh-outline" size={24} color={colors.primary} />
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={onHide}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Hide ${name.name} permanently`}
          >
            <Ionicons name="eye-off-outline" size={24} color="#FF6B6B" />
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF8FA',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
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
  genderEmoji: {
    fontSize: 20,
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
  stateHint: {
    fontSize: 12,
    fontFamily: Fonts?.sans,
    color: '#A89BB5',
  },
  actionButton: {
    padding: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
