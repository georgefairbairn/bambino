import { View, Text, StyleSheet } from 'react-native';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

type Size = 'small' | 'large';

interface RankBadgeProps {
  rank: number | null | undefined;
  size?: Size;
}

export function RankBadge({ rank, size = 'large' }: RankBadgeProps) {
  const { colors } = useTheme();
  const isLarge = size === 'large';
  const hasRank = rank !== null && rank !== undefined;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: hasRank ? colors.secondaryLight : colors.surfaceSubtle,
        },
        isLarge && styles.badgeLarge,
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: hasRank ? colors.secondary : '#A89BB5',
          },
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
  label: {
    fontSize: 12,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
  },
  labelLarge: {
    fontSize: 16,
  },
});
