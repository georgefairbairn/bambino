import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Fonts } from '@/constants/theme';

interface OriginPickerProps {
  value: string[];
  onChange: (origins: string[]) => void;
}

export function OriginPicker({ value, onChange }: OriginPickerProps) {
  const availableOrigins = useQuery(api.names.getAvailableOrigins);
  const selectedSet = new Set(value);

  const toggleOrigin = (origin: string) => {
    const newSet = new Set(selectedSet);
    if (newSet.has(origin)) {
      newSet.delete(origin);
    } else {
      newSet.add(origin);
    }
    onChange(Array.from(newSet).sort());
  };

  const selectAll = () => {
    if (availableOrigins) {
      onChange([...availableOrigins]);
    }
  };

  const clearAll = () => {
    onChange([]);
  };

  if (availableOrigins === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#0a7ea4" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.quickActions}>
        <Pressable style={styles.quickActionButton} onPress={selectAll}>
          <Text style={styles.quickActionText}>Select All</Text>
        </Pressable>
        <Pressable style={styles.quickActionButton} onPress={clearAll}>
          <Text style={styles.quickActionText}>Clear All</Text>
        </Pressable>
      </View>
      <View style={styles.grid}>
        {availableOrigins.map((origin) => {
          const isSelected = selectedSet.has(origin);
          return (
            <Pressable
              key={origin}
              style={[styles.originButton, isSelected && styles.originButtonSelected]}
              onPress={() => toggleOrigin(origin)}
            >
              <Text style={[styles.originText, isSelected && styles.originTextSelected]}>
                {origin}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>
        {value.length === 0 ? 'All origins included' : `${value.length} origin(s) selected`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },
  quickActionText: {
    fontSize: 12,
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    color: '#0a7ea4',
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  originButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
  },
  originButtonSelected: {
    backgroundColor: '#0a7ea4',
  },
  originText: {
    fontSize: 13,
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    color: '#6b7280',
  },
  originTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    color: '#9ca3af',
    fontStyle: 'italic',
  },
});
