import { View, Text, StyleSheet } from 'react-native';
import { Fonts } from '@/constants/theme';

type Size = 'small' | 'large';

interface RankBadgeProps {
  rank: number | null | undefined;
  size?: Size;
}

export function RankBadge({ rank, size = 'large' }: RankBadgeProps) {
  const isLarge = size === 'large';
  const hasRank = rank !== null && rank !== undefined;

  return (
    <View
      style={[
        styles.badge,
        hasRank ? styles.badgeRanked : styles.badgeUnranked,
        isLarge && styles.badgeLarge,
      ]}
    >
      <Text
        style={[
          styles.label,
          hasRank ? styles.labelRanked : styles.labelUnranked,
          isLarge && styles.labelLarge,
        ]}
      >
        {hasRank ? `#${rank}` : 'Unranked'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeLarge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  badgeRanked: {
    backgroundColor: '#fef3c7', // amber-100
  },
  badgeUnranked: {
    backgroundColor: '#f3f4f6', // gray-100
  },
  label: {
    fontSize: 12,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
  },
  labelLarge: {
    fontSize: 16,
  },
  labelRanked: {
    color: '#92400e', // amber-800
  },
  labelUnranked: {
    color: '#6b7280', // gray-500
  },
});
