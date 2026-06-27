import { View, Text, Switch, StyleSheet } from 'react-native';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { CATEGORY_KEYS, CATEGORY_META } from '@/constants/categories';
import { CategoryToggleRow } from '@/components/search/category-toggle-row';

interface CategoryToggleListProps {
  // null = all categories, [] = none, [...] = specific categories
  value: string[] | null;
  onChange: (categories: string[] | null) => void;
}

export function CategoryToggleList({ value, onChange }: CategoryToggleListProps) {
  const { colors } = useTheme();

  const isAllSelected = value === null;
  const selectedSet = new Set(value ?? []);
  const selectedCount = value?.length ?? 0;

  // All ON → OFF: deselect everything. All OFF → ON: select all.
  const handleToggleAll = () => {
    onChange(isAllSelected ? [] : null);
  };

  const handleToggleCategory = (key: string) => {
    if (isAllSelected) {
      // From "all" state: select all EXCEPT this one
      onChange(CATEGORY_KEYS.filter((k) => k !== key));
    } else if (selectedSet.has(key)) {
      // Deselect this category. value is non-null here (isAllSelected is false),
      // but use `?? []` instead of a non-null assertion (#207).
      onChange((value ?? []).filter((k) => k !== key));
    } else {
      // Select this category — rebuild from CATEGORY_KEYS to keep canonical order,
      // collapsing to null (all) when every category ends up selected.
      const next = CATEGORY_KEYS.filter((k) => k === key || selectedSet.has(k));
      onChange(next.length === CATEGORY_KEYS.length ? null : next);
    }
  };

  const isCategoryActive = (key: string) => isAllSelected || selectedSet.has(key);

  // Badge display
  let badgeText: string;
  let badgeStyle: { backgroundColor: string; color: string };
  if (isAllSelected) {
    badgeText = 'All';
    badgeStyle = { backgroundColor: colors.primaryLight, color: colors.tabActive };
  } else {
    badgeText = `${selectedCount}`;
    badgeStyle = { backgroundColor: colors.primary, color: '#FFFFFF' };
  }

  return (
    <View style={styles.container}>
      {/* Header (always expanded — only 6 categories) */}
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <View style={[styles.badge, { backgroundColor: badgeStyle.backgroundColor }]}>
          <Text style={[styles.badgeText, { color: badgeStyle.color }]}>{badgeText}</Text>
        </View>
      </View>

      <View style={styles.body}>
        {/* All Categories master row */}
        <View style={[styles.allRow, { shadowColor: colors.secondary }]}>
          <View>
            <Text style={styles.allRowLabel}>All Categories</Text>
            <Text style={styles.allRowSub}>Include every category</Text>
          </View>
          <Switch
            value={isAllSelected}
            onValueChange={handleToggleAll}
            trackColor={{ false: '#E5DDD0', true: colors.primary }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#E5DDD0"
          />
        </View>

        {/* Individual category rows */}
        {CATEGORY_KEYS.map((key) => (
          <CategoryToggleRow
            key={key}
            label={CATEGORY_META[key].label}
            isActive={isCategoryActive(key)}
            onToggle={() => handleToggleCategory(key)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#2D1B4E',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  body: {
    gap: 12,
    marginTop: 4,
  },
  allRow: {
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
  allRowLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D1B4E',
  },
  allRowSub: {
    fontSize: 10,
    color: '#A89BB5',
    marginTop: 2,
  },
});
