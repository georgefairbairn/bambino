import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { Doc } from '@/convex/_generated/dataModel';

interface LikedNameCardProps {
  name: Doc<'names'>;
  likedAt: number;
  onRemove: () => void;
  onPress: () => void;
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

export function LikedNameCard({ name, likedAt, onRemove, onPress }: LikedNameCardProps) {
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
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.mainContent}>
        <View style={styles.nameRow}>
          <Text style={styles.genderEmoji}>{genderEmoji}</Text>
          <Text style={styles.name}>{name.name}</Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.originBadge}>
            <Text style={styles.originText}>{name.origin}</Text>
          </View>
          <Text style={styles.timestamp}>Liked {relativeTime}</Text>
        </View>
      </View>

      <Pressable
        style={styles.removeButton}
        onPress={handleRemove}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="trash-outline" size={20} color="#ef4444" />
      </Pressable>
    </Pressable>
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
  removeButton: {
    padding: 8,
  },
});
