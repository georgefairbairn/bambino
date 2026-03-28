import { View, Text, Switch, Pressable, StyleSheet } from 'react-native';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

interface OriginToggleRowProps {
  origin: string;
  count: number;
  isActive: boolean;
  onToggle: () => void;
}

export function OriginToggleRow({ origin, count, isActive, onToggle }: OriginToggleRowProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onToggle}
      style={[
        styles.row,
        { shadowColor: colors.secondary },
      ]}
    >
      <View style={styles.textContainer}>
        <Text style={[styles.name, isActive && styles.nameActive]}>{origin}</Text>
        <Text style={styles.count}>{count.toLocaleString()} {count === 1 ? 'name' : 'names'}</Text>
      </View>
      <Switch
        value={isActive}
        onValueChange={onToggle}
        trackColor={{ false: '#E5DDD0', true: colors.primary }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#E5DDD0"
      />
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
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: '#2D1B4E',
    fontWeight: '500',
  },
  nameActive: {
    fontWeight: '700',
  },
  count: {
    fontSize: 10,
    fontFamily: Fonts?.sans,
    color: '#A89BB5',
    marginTop: 2,
  },
});
