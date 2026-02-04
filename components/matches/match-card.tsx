import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { Doc, Id } from '@/convex/_generated/dataModel';

interface MatchCardProps {
  match: {
    _id: Id<'matches'>;
    nameId: Id<'names'>;
    isFavorite?: boolean;
    notes?: string;
    rank?: number;
    isChosen?: boolean;
    matchedAt: number;
    name: Doc<'names'>;
  };
  onPress: () => void;
  onToggleFavorite: () => void;
  onChoose?: () => void;
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

export function MatchCard({ match, onPress, onToggleFavorite, onChoose }: MatchCardProps) {
  const { name, isFavorite, isChosen, rank, notes, matchedAt } = match;
  const genderEmoji = GENDER_EMOJI[name.gender] ?? '👶';
  const relativeTime = getRelativeTime(matchedAt);

  return (
    <Pressable style={[styles.card, isChosen && styles.cardChosen]} onPress={onPress}>
      {/* Chosen indicator */}
      {isChosen && (
        <View style={styles.chosenBadge}>
          <Ionicons name="trophy" size={14} color="#fff" />
          <Text style={styles.chosenText}>Chosen</Text>
        </View>
      )}

      {/* Rank badge */}
      {rank !== undefined && rank > 0 && (
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>#{rank}</Text>
        </View>
      )}

      <View style={styles.mainContent}>
        <View style={styles.nameRow}>
          <Text style={styles.genderEmoji}>{genderEmoji}</Text>
          <Text style={styles.name}>{name.name}</Text>
          <View style={styles.matchIndicator}>
            <Ionicons name="heart" size={12} color="#fff" />
            <Ionicons name="heart" size={12} color="#fff" />
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.originBadge}>
            <Text style={styles.originText}>{name.origin}</Text>
          </View>
          <Text style={styles.timestamp}>Matched {relativeTime}</Text>
        </View>

        {notes && (
          <View style={styles.notesRow}>
            <Ionicons name="document-text-outline" size={14} color="#6b7280" />
            <Text style={styles.notesPreview} numberOfLines={1}>
              {notes}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        {/* Favorite button */}
        <Pressable
          style={styles.actionButton}
          onPress={onToggleFavorite}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isFavorite ? 'star' : 'star-outline'}
            size={24}
            color={isFavorite ? '#f59e0b' : '#9ca3af'}
          />
        </Pressable>

        {/* Choose button */}
        {onChoose && !isChosen && (
          <Pressable
            style={styles.actionButton}
            onPress={onChoose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trophy-outline" size={22} color="#0a7ea4" />
          </Pressable>
        )}
      </View>
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
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardChosen: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  chosenBadge: {
    position: 'absolute',
    top: -8,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  chosenText: {
    fontSize: 11,
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    fontWeight: '600',
    color: '#fff',
  },
  rankBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: '#0a7ea4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  rankText: {
    fontSize: 11,
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    fontWeight: '600',
    color: '#fff',
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
    flex: 1,
  },
  matchIndicator: {
    flexDirection: 'row',
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 2,
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
  notesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  notesPreview: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  actions: {
    gap: 8,
    alignItems: 'center',
  },
  actionButton: {
    padding: 4,
  },
});
