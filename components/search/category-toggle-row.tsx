import { View, Text, Switch, Pressable, StyleSheet } from 'react-native';
import { BUTTON_TEXT } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

interface CategoryToggleRowProps {
  label: string;
  isActive: boolean;
  onToggle: () => void;
}

export function CategoryToggleRow({ label, isActive, onToggle }: CategoryToggleRowProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: isActive }}
      accessibilityLabel={label}
      style={[styles.row, { shadowColor: colors.secondary }]}
    >
      <Text style={styles.name}>{label}</Text>
      {/* Visual indicator only. The row Pressable owns the tap; without this the
          Switch's own onValueChange fired alongside the row press, double-firing
          onToggle and reverting the change (#191). pointerEvents="none" lets
          taps on the switch fall through to the Pressable. */}
      <View pointerEvents="none">
        <Switch
          value={isActive}
          trackColor={{ false: '#E5DDD0', true: colors.primary }}
          thumbColor="#FFFFFF"
          ios_backgroundColor="#E5DDD0"
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF8FA',
    borderRadius: 16,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  name: {
    ...BUTTON_TEXT.pill,
    flex: 1,
    marginRight: 12,
    color: '#2D1B4E',
  },
});
