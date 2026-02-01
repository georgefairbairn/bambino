import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { Doc } from '@/convex/_generated/dataModel';

interface RejectedNameCardProps {
  name: Doc<'names'>;
  rejectedAt: number;
  onRestore: () => void;
  onHide: () => void;
}

const GENDER_EMOJI: Record<string, string> = {
  boy: '👦',
  girl: '👧',
  unisex: '👶',
};

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (months > 0) {
    return `${months} month${months > 1 ? 's' : ''} ago`;
  }
  if (weeks > 0) {
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  return 'Just now';
}

export function RejectedNameCard({ name, rejectedAt, onRestore, onHide }: RejectedNameCardProps) {
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
    <View style={styles.card}>
      <View style={styles.mainContent}>
        <View style={styles.nameRow}>
          <Text style={styles.genderEmoji}>{genderEmoji}</Text>
          <Text style={styles.name}>{name.name}</Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.originBadge}>
            <Text style={styles.originText}>{name.origin}</Text>
          </View>
          <Text style={styles.timestamp}>Rejected {relativeTime}</Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <Pressable
          style={styles.restoreButton}
          onPress={handleRestore}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="refresh-outline" size={20} color="#0a7ea4" />
        </Pressable>
        <Pressable
          style={styles.hideButton}
          onPress={handleHide}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="eye-off-outline" size={20} color="#ef4444" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFBF5',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
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
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#1a1a1a',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  originBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  originText: {
    fontSize: 12,
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    color: '#0a7ea4',
  },
  timestamp: {
    fontSize: 12,
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    color: '#9ca3af',
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
