import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { GENDER_EMOJI } from '@/constants/names';
import { getRelativeTime } from '@/lib/format';
import { getOriginFlag } from '@/constants/origins';
import { useTheme } from '@/contexts/theme-context';
import { Doc } from '@/convex/_generated/dataModel';

interface LikedNameCardProps {
  name: Doc<'names'>;
  likedAt: number;
  onRemove: () => void;
  onPress: () => void;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export function LikedNameCard({
  name,
  likedAt,
  onRemove,
  onPress,
  selectMode,
  selected,
  onToggleSelect,
}: LikedNameCardProps) {
  const { colors } = useTheme();
  const genderEmoji = GENDER_EMOJI[name.gender] ?? '👶';
  const relativeTime = getRelativeTime(likedAt);

  const handleRemove = () => {
    Alert.alert(
      'Remove from Liked',
      `Remove "${name.name}" from your liked names? It will reappear in your swipe queue.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: onRemove },
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
          <Text style={styles.timestamp}>Liked {relativeTime}</Text>
        </View>
      </View>

      {!selectMode && (
        <Pressable
          style={styles.removeButton}
          onPress={handleRemove}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
        </Pressable>
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
  removeButton: {
    padding: 8,
  },
});
