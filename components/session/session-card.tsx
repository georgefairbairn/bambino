import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';

type GenderFilter = 'boy' | 'girl' | 'both';

interface SessionCardProps {
  name: string;
  genderFilter: GenderFilter;
  role: 'owner' | 'partner';
  isActive: boolean;
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

export function SessionCard({
  name,
  genderFilter,
  role,
  isActive,
  stats,
  onPress,
  onMenuPress,
}: SessionCardProps) {
  const genderInfo = GENDER_LABELS[genderFilter];

  return (
    <Pressable style={[styles.card, isActive && styles.cardActive]} onPress={onPress}>
      {/* Header row */}
      <View style={styles.header}>
        {isActive ? (
          <View style={styles.activeBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#0a7ea4" />
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        ) : (
          <View style={styles.placeholder} />
        )}
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

      {/* Session name */}
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>

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
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardActive: {
    borderColor: '#0a7ea4',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e0f2fe',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: 12,
    color: '#0a7ea4',
    fontWeight: '600',
  },
  placeholder: {
    height: 24,
  },
  menuButton: {
    padding: 4,
  },
  name: {
    fontSize: 24,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#1a1a1a',
    marginBottom: 8,
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
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
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
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
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
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    color: '#4b5563',
  },
  roleTextPartner: {
    color: '#92400e',
  },
});
