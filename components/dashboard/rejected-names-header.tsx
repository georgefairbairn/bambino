import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

export type RejectedSortOption = 'name_asc' | 'name_desc' | 'rejected_newest' | 'rejected_oldest';

interface RejectedNamesHeaderProps {
  count: number;
  sortBy: RejectedSortOption;
  onSortChange: (sort: RejectedSortOption) => void;
}

const SORT_OPTIONS: { value: RejectedSortOption; label: string }[] = [
  { value: 'rejected_newest', label: 'Recently Rejected' },
  { value: 'rejected_oldest', label: 'Oldest First' },
  { value: 'name_asc', label: 'Name A-Z' },
  { value: 'name_desc', label: 'Name Z-A' },
];

export function RejectedNamesHeader({ count, sortBy, onSortChange }: RejectedNamesHeaderProps) {
  const { colors } = useTheme();
  const [showSortPicker, setShowSortPicker] = useState(false);

  const currentSortLabel = SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label ?? 'Sort';

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.title}>Rejected</Text>
        <Pressable style={styles.sortButton} onPress={() => setShowSortPicker(true)}>
          <Ionicons name="swap-vertical" size={16} color="#6B5B7B" />
          <Text style={styles.sortButtonText}>{currentSortLabel}</Text>
          <Ionicons name="chevron-down" size={14} color="#6B5B7B" />
        </Pressable>
      </View>

      <View style={styles.countRow}>
        <Text style={styles.countText}>{count} names</Text>
      </View>

      <Modal
        visible={showSortPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowSortPicker(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sort by</Text>
            {SORT_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.sortOption,
                  sortBy === option.value && { backgroundColor: colors.primaryLight },
                ]}
                onPress={() => {
                  onSortChange(option.value);
                  setShowSortPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortBy === option.value && {
                      color: colors.primary,
                      fontWeight: '600' as const,
                    },
                  ]}
                >
                  {option.label}
                </Text>
                {sortBy === option.value && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#2D1B4E',
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  countText: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  sortButtonText: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#2D1B4E',
    marginBottom: 12,
    textAlign: 'center',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  sortOptionText: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    color: '#2D1B4E',
  },
});
