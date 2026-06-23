import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { CATEGORY_KEYS, CATEGORY_META, type CategoryKey } from '@/constants/categories';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { CategoryFilterSheet } from './category-filter-sheet';

interface CategoryPanelGridProps {
  value: string[] | null; // null = all-on
  onChange: (next: string[] | null) => void;
}

export function CategoryPanelGrid({ value, onChange }: CategoryPanelGridProps) {
  const { colors } = useTheme();
  const [openCategory, setOpenCategory] = useState<CategoryKey | null>(null);

  const isOn = (key: CategoryKey) => value === null || value.includes(key);
  const selectedCount = value === null ? CATEGORY_KEYS.length : value.length;
  const badgeText = value === null ? 'All' : `${selectedCount}`;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <View
          style={[
            styles.badge,
            { backgroundColor: value === null ? colors.primaryLight : colors.primary },
          ]}
        >
          <Text
            style={[styles.badgeText, { color: value === null ? colors.tabActive : '#FFFFFF' }]}
          >
            {badgeText}
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        {CATEGORY_KEYS.map((key) => {
          const on = isOn(key);
          return (
            <Pressable
              key={key}
              onPress={() => setOpenCategory(key)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${CATEGORY_META[key].label}, ${on ? 'on' : 'off'}`}
              style={[
                styles.panel,
                { shadowColor: colors.secondary },
                on
                  ? { backgroundColor: colors.surfaceSubtle, borderColor: colors.primary }
                  : { backgroundColor: '#F4F1F7', borderColor: 'transparent', opacity: 0.55 },
              ]}
            >
              <Text style={[styles.panelLabel, on && { color: '#2D1B4E' }]}>
                {CATEGORY_META[key].label}
              </Text>
              <Text style={styles.panelState}>{on ? 'On' : 'Off'}</Text>
            </Pressable>
          );
        })}
      </View>

      <CategoryFilterSheet
        category={openCategory}
        value={value}
        onChange={onChange}
        onClose={() => setOpenCategory(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#2D1B4E',
  },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  panel: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  panelLabel: { fontSize: 15, fontWeight: '700', color: '#6B5B7B' },
  panelState: { fontSize: 11, color: '#A89BB5', marginTop: 4 },
});
