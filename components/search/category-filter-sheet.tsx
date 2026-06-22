import { View, Text, Switch, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedBottomSheet } from '@/components/ui/animated-bottom-sheet';
import { GradientButton } from '@/components/ui/gradient-button';
import { CATEGORY_KEYS, CATEGORY_META, type CategoryKey } from '@/constants/categories';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

interface CategoryFilterSheetProps {
  category: CategoryKey | null; // null = closed
  value: string[] | null; // null = all-on
  onChange: (next: string[] | null) => void;
  onClose: () => void;
}

export function CategoryFilterSheet({
  category,
  value,
  onChange,
  onClose,
}: CategoryFilterSheetProps) {
  const { colors } = useTheme();
  if (!category) return null;

  const meta = CATEGORY_META[category];
  const isAllOn = value === null;
  const isOn = isAllOn || value.includes(category);
  const isSolo = value !== null && value.length === 1 && value[0] === category;

  const handleToggle = () => {
    if (isSolo) return; // locked on while soloed
    if (isAllOn) {
      // From all-on, turning this off = "all except this".
      onChange(CATEGORY_KEYS.filter((k) => k !== category));
    } else if (value.includes(category)) {
      onChange(value.filter((k) => k !== category));
    } else {
      const next = CATEGORY_KEYS.filter((k) => k === category || value.includes(k));
      onChange(next.length === CATEGORY_KEYS.length ? null : next);
    }
  };

  const handleViewOnly = () => {
    onChange([category]);
    onClose();
  };

  return (
    <AnimatedBottomSheet
      visible={category !== null}
      onClose={onClose}
      backgroundColor={colors.surface}
      style={{ paddingHorizontal: 24, paddingBottom: 40 }}
    >
      <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
      <View style={styles.header}>
        <Text style={styles.title}>{meta.label}</Text>
        <Pressable
          onPress={onClose}
          hitSlop={8}
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={24} color="#6B5B7B" />
        </Pressable>
      </View>
      <Text style={styles.description}>{meta.description}</Text>

      <View style={[styles.row, { shadowColor: colors.secondary }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowLabel}>Show {meta.label}</Text>
          {isSolo && <Text style={styles.rowSub}>Locked while viewing only this category</Text>}
        </View>
        <View pointerEvents={isSolo ? 'none' : 'auto'}>
          <Switch
            value={isOn}
            onValueChange={handleToggle}
            disabled={isSolo}
            trackColor={{ false: '#E5DDD0', true: colors.primary }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#E5DDD0"
          />
        </View>
      </View>

      <GradientButton
        title={isSolo ? `Viewing only ${meta.label}` : `View only ${meta.label}`}
        onPress={handleViewOnly}
        variant="primary"
        disabled={isSolo}
      />
    </AnimatedBottomSheet>
  );
}

const styles = StyleSheet.create({
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 22, fontFamily: Fonts?.title || 'Gabarito_800ExtraBold', color: '#2D1B4E' },
  description: { fontSize: 13, color: '#6B5B7B', marginBottom: 16 },
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
    marginBottom: 12,
  },
  rowLabel: { fontSize: 14, fontWeight: '700', color: '#2D1B4E' },
  rowSub: { fontSize: 10, color: '#A89BB5', marginTop: 2 },
});
