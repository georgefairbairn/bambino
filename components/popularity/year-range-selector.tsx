import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BUTTON_TEXT } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

type YearRange = '20' | '50' | 'all';

interface YearRangeSelectorProps {
  selected: YearRange;
  onSelect: (range: YearRange) => void;
}

const OPTIONS: { value: YearRange; label: string }[] = [
  { value: '20', label: '20 YEARS' },
  { value: '50', label: '50 YEARS' },
  { value: 'all', label: 'ALL TIME' },
];

export function YearRangeSelector({ selected, onSelect }: YearRangeSelectorProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {OPTIONS.map((option) => {
        const isActive = selected === option.value;
        return (
          <Pressable
            key={option.value}
            style={[styles.pill, isActive && { backgroundColor: colors.primaryLight }]}
            onPress={() => onSelect(option.value)}
          >
            <Text style={[styles.pillText, isActive && { color: colors.primary }]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  pillText: {
    ...BUTTON_TEXT.pill,
    fontSize: 12, // compact 3-up control; keep tight to avoid overflow
    color: '#6B5B7B', // textSecondary
  },
});

export type { YearRange };
