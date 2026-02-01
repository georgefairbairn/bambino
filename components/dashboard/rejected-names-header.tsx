import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';

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
  const [showSortPicker, setShowSortPicker] = useState(false);

  const currentSortLabel = SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label ?? 'Sort';

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Rejected Names</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      </View>

      <Pressable style={styles.sortButton} onPress={() => setShowSortPicker(true)}>
        <Ionicons name="swap-vertical" size={16} color="#6b7280" />
        <Text style={styles.sortButtonText}>{currentSortLabel}</Text>
        <Ionicons name="chevron-down" size={14} color="#6b7280" />
      </Pressable>

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
                style={[styles.sortOption, sortBy === option.value && styles.sortOptionActive]}
                onPress={() => {
                  onSortChange(option.value);
                  setShowSortPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortBy === option.value && styles.sortOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                {sortBy === option.value && <Ionicons name="checkmark" size={20} color="#0a7ea4" />}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#1a1a1a',
  },
  countBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
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
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    color: '#6b7280',
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
    color: '#1a1a1a',
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
  sortOptionActive: {
    backgroundColor: '#e0f2fe',
  },
  sortOptionText: {
    fontSize: 16,
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    color: '#374151',
  },
  sortOptionTextActive: {
    color: '#0a7ea4',
    fontWeight: '600',
  },
});
