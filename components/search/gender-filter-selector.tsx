import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Fonts } from '@/constants/theme';

type GenderFilter = 'boy' | 'girl' | 'both';

interface GenderFilterSelectorProps {
  value: GenderFilter;
  onChange: (value: GenderFilter) => void;
}

const OPTIONS: { value: GenderFilter; label: string; emoji: string }[] = [
  { value: 'boy', label: 'Boy', emoji: '👦' },
  { value: 'both', label: 'Both', emoji: '👶' },
  { value: 'girl', label: 'Girl', emoji: '👧' },
];

export function GenderFilterSelector({ value, onChange }: GenderFilterSelectorProps) {
  return (
    <View style={styles.container}>
      {OPTIONS.map((option) => {
        const isSelected = value === option.value;
        return (
          <Pressable
            key={option.value}
            style={[styles.option, isSelected && styles.optionSelected]}
            onPress={() => onChange(option.value)}
          >
            <Text style={styles.emoji}>{option.emoji}</Text>
            <Text style={[styles.label, isSelected && styles.labelSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
  },
  optionSelected: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  emoji: {
    fontSize: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#6b7280',
  },
  labelSelected: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
});
