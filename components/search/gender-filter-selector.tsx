import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { useSkinTone } from '@/contexts/skin-tone-context';
import { getGenderEmoji } from '@/constants/skin-tone';

type GenderFilter = 'boy' | 'girl' | 'both';

interface GenderFilterSelectorProps {
  value: GenderFilter;
  onChange: (value: GenderFilter) => void;
}

const OPTIONS: { value: GenderFilter; label: string }[] = [
  { value: 'boy', label: 'Boy' },
  { value: 'both', label: 'Both' },
  { value: 'girl', label: 'Girl' },
];

export function GenderFilterSelector({ value, onChange }: GenderFilterSelectorProps) {
  const { colors } = useTheme();
  const { skinTone } = useSkinTone();

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceSubtle }]}>
      {OPTIONS.map((option) => {
        const isSelected = value === option.value;
        return (
          <Pressable
            key={option.value}
            style={[styles.option, isSelected && styles.optionSelected]}
            onPress={() => onChange(option.value)}
          >
            <Text style={styles.emoji}>{getGenderEmoji(option.value, skinTone)}</Text>
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
    color: '#6B5B7B',
  },
  labelSelected: {
    color: '#2D1B4E',
    fontWeight: '600',
  },
});
