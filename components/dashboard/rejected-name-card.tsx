import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { GENDER_EMOJI } from '@/constants/names';
import { getRelativeTime } from '@/lib/format';
import { getOriginFlag } from '@/constants/origins';
import { useTheme } from '@/contexts/theme-context';
import { Doc } from '@/convex/_generated/dataModel';

interface RejectedNameCardProps {
  name: Doc<'names'>;
  rejectedAt: number;
  onRestore: () => void;
  onHide: () => void;
  onPress: () => void;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export function RejectedNameCard({
  name,
  rejectedAt,
  onRestore,
  onHide,
  onPress,
  selectMode,
  selected,
  onToggleSelect,
}: RejectedNameCardProps) {
  const { colors } = useTheme();
  const genderEmoji = GENDER_EMOJI[name.gender] ?? '👶';
  const relativeTime = getRelativeTime(rejectedAt);

  const handleRestore = () => {
    Alert.alert(
      'Restore to Queue',
      `Restore "${name.name}" to your swipe queue? You'll be able to reconsider this name.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', onPress: onRestore },
      ],
    );
  };

  const handleHide = () => {
    Alert.alert(
      'Hide Permanently',
      `Hide "${name.name}" permanently? It will never appear in your swipe queue again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Hide', style: 'destructive', onPress: onHide },
      ],
    );
  };

  return (
    <Pressable
      style={[
        styles.card,
        { shadowColor: colors.secondary },
        selectMode && selected && { borderWidth: 2, borderColor: colors.primary },
      ]}
      onPress={selectMode ? onToggleSelect : onPress}
    >
      {selectMode && (
        <View style={styles.checkboxContainer}>
          <Ionicons
            name={selected ? 'checkbox' : 'square-outline'}
            size={24}
            color={selected ? colors.primary : '#A89BB5'}
          />
        </View>
      )}
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
          <Text style={styles.timestamp}>Rejected {relativeTime}</Text>
        </View>
      </View>

      {!selectMode && (
        <View style={styles.actionButtons}>
          <Pressable
            style={styles.restoreButton}
            onPress={handleRestore}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="refresh-outline" size={20} color={colors.primary} />
          </Pressable>
          <Pressable
            style={styles.hideButton}
            onPress={handleHide}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="eye-off-outline" size={20} color="#FF6B6B" />
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  checkboxContainer: {
    marginRight: 12,
  },
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
  timestamp: {
    fontSize: 12,
    fontFamily: Fonts?.sans,
    color: '#A89BB5',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  restoreButton: {
    padding: 8,
  },
  hideButton: {
    padding: 8,
  },
});
