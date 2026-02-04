import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Fonts } from '@/constants/theme';

type YearRange = '20' | '50' | 'all';

interface YearRangeSelectorProps {
  selected: YearRange;
  onSelect: (range: YearRange) => void;
}

const OPTIONS: { value: YearRange; label: string }[] = [
  { value: '20', label: '20 Years' },
  { value: '50', label: '50 Years' },
  { value: 'all', label: 'All Time' },
];

export function YearRangeSelector({ selected, onSelect }: YearRangeSelectorProps) {
  return (
    <View style={styles.container}>
      {OPTIONS.map((option) => {
        const isActive = selected === option.value;
        return (
          <Pressable
            key={option.value}
            style={[styles.pill, isActive && styles.pillActive]}
            onPress={() => onSelect(option.value)}
          >
            <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{option.label}</Text>
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
  pillActive: {
    backgroundColor: '#e0f2fe', // sky-100
  },
  pillText: {
    fontSize: 12,
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    color: '#6b7280', // gray-500
  },
  pillTextActive: {
    color: '#0a7ea4', // sky-700
    fontWeight: '600',
  },
});

export type { YearRange };
