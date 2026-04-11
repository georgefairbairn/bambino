import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { getOriginFlag } from '@/constants/origins';
import { useTheme } from '@/contexts/theme-context';
import { Doc, Id } from '@/convex/_generated/dataModel';

interface MatchCardProps {
  match: {
    _id: Id<'matches'>;
    nameId: Id<'names'>;
    isFavorite?: boolean;
    notes?: string;
    rank?: number;
    isChosen?: boolean;
    proposalStatus?: 'pending' | 'accepted' | 'declined';
    proposedBy?: Id<'users'>;
    matchedAt: number;
    name: Doc<'names'>;
  };
  currentUserId?: Id<'users'>;
  onPress: () => void;
  onPropose?: () => void;
  onWithdraw?: () => void;
}

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

const GENDER_EMOJI: Record<string, string> = {
  boy: '\u{1F466}',
  girl: '\u{1F467}',
  unisex: '\u{1F476}',
};

export function MatchCard({
  match,
  currentUserId,
  onPress,
  onPropose,
  onWithdraw,
}: MatchCardProps) {
  const { colors } = useTheme();
  const { name, isFavorite, isChosen, proposalStatus, proposedBy, matchedAt } = match;
  const genderEmoji = GENDER_EMOJI[name.gender] ?? '\u{1F476}';
  const relativeTime = getRelativeTime(matchedAt);

  const isPending = proposalStatus === 'pending';
  const isCurrentUserProposer = isPending && proposedBy === currentUserId;

  return (
    <Pressable
      style={[
        styles.card,
        { shadowColor: colors.secondary },
        isChosen && styles.cardChosen,
        isPending && !isChosen && { borderColor: colors.primary, borderWidth: 2 },
      ]}
      onPress={onPress}
    >
      {isChosen && (
        <View style={styles.chosenBadge}>
          <Ionicons name="trophy" size={14} color="#fff" />
          <Text style={styles.chosenText}>Chosen</Text>
        </View>
      )}

      {isPending && !isChosen && (
        <View style={[styles.chosenBadge, { backgroundColor: colors.primary }]}>
          <Ionicons name="hand-left" size={14} color="#fff" />
          <Text style={styles.chosenText}>Proposed</Text>
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
          <Text style={styles.timestamp}>Matched {relativeTime}</Text>
        </View>
      </View>

      {/* Propose / Withdraw action */}
      {isCurrentUserProposer && onWithdraw ? (
        <Pressable
          style={styles.actionButton}
          onPress={onWithdraw}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
        </Pressable>
      ) : !isChosen && !isPending && onPropose ? (
        <Pressable
          style={styles.actionButton}
          onPress={onPropose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="checkmark-circle-outline" size={24} color="#A89BB5" />
        </Pressable>
      ) : null}
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
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardChosen: {
    borderColor: '#FFB86C',
    backgroundColor: '#FFF5EB',
  },
  chosenBadge: {
    position: 'absolute',
    top: -8,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFB86C',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  chosenText: {
    fontSize: 11,
    fontFamily: Fonts?.sans,
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
  actionButton: {
    padding: 8,
  },
});
