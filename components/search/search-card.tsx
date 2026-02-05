import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';

type GenderFilter = 'boy' | 'girl' | 'both';

interface SearchCardProps {
  name: string;
  genderFilter: GenderFilter;
  role: 'owner' | 'partner';
  partnerName?: string;
  stats: {
    total: number;
    liked: number;
  };
  onPress: () => void;
  onMenuPress: () => void;
}

const GENDER_LABELS: Record<GenderFilter, { emoji: string; label: string }> = {
  boy: { emoji: '👦', label: 'Boy' },
  girl: { emoji: '👧', label: 'Girl' },
  both: { emoji: '👶', label: 'Both' },
};

export function SearchCard({
  name,
  genderFilter,
  role,
  partnerName,
  stats,
  onPress,
  onMenuPress,
}: SearchCardProps) {
  const genderInfo = GENDER_LABELS[genderFilter];

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* Header row with title */}
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Pressable
          style={styles.menuButton}
          onPress={(e) => {
            e.stopPropagation();
            onMenuPress();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#6b7280" />
        </Pressable>
      </View>

      {/* Partner tag (if joined by someone) */}
      {partnerName && (
        <View style={styles.partnerRow}>
          <View style={styles.partnerBadge}>
            <Ionicons name="people" size={12} color="#0369a1" />
            <Text style={styles.partnerText}>{partnerName}</Text>
          </View>
        </View>
      )}

      {/* Gender filter */}
      <View style={styles.genderRow}>
        <Text style={styles.genderEmoji}>{genderInfo.emoji}</Text>
        <Text style={styles.genderLabel}>{genderInfo.label}</Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <Text style={styles.statsText}>{stats.total} reviewed</Text>
        <Text style={styles.statsDot}>•</Text>
        <Text style={styles.statsText}>{stats.liked} ❤️</Text>
      </View>

      {/* Role badge */}
      <View style={styles.roleRow}>
        <View style={[styles.roleBadge, role === 'partner' && styles.roleBadgePartner]}>
          <Text style={[styles.roleText, role === 'partner' && styles.roleTextPartner]}>
            {role === 'owner' ? 'Owner' : 'Partner'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFBF5',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  menuButton: {
    padding: 4,
  },
  name: {
    fontSize: 24,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  partnerRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e0f2fe',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  partnerText: {
    fontSize: 12,
    fontFamily: Fonts?.sans,
    color: '#0369a1',
    fontWeight: '500',
  },
  genderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  genderEmoji: {
    fontSize: 16,
  },
  genderLabel: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#6b7280',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  statsText: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#4b5563',
  },
  statsDot: {
    fontSize: 14,
    color: '#9ca3af',
  },
  roleRow: {
    flexDirection: 'row',
  },
  roleBadge: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  roleBadgePartner: {
    backgroundColor: '#fef3c7',
  },
  roleText: {
    fontSize: 12,
    fontFamily: Fonts?.sans,
    color: '#4b5563',
  },
  roleTextPartner: {
    color: '#92400e',
  },
});
