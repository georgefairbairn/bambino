import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Fonts } from '@/constants/theme';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
import { useTheme } from '@/contexts/theme-context';

interface OriginPickerProps {
  value: string[];
  onChange: (origins: string[]) => void;
}

export function OriginPicker({ value, onChange }: OriginPickerProps) {
  const { colors } = useTheme();
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
        <LoadingIndicator size="small" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.quickActions}>
        <Pressable
          style={[styles.quickActionButton, { backgroundColor: colors.surfaceSubtle }]}
          onPress={selectAll}
        >
          <Text style={[styles.quickActionText, { color: colors.primary }]}>Select All</Text>
        </Pressable>
        <Pressable
          style={[styles.quickActionButton, { backgroundColor: colors.surfaceSubtle }]}
          onPress={clearAll}
        >
          <Text style={[styles.quickActionText, { color: colors.primary }]}>Clear All</Text>
        </Pressable>
      </View>
      <View style={styles.grid}>
        {availableOrigins.map((origin) => {
          const isSelected = selectedSet.has(origin);
          return (
            <Pressable
              key={origin}
              style={[
                styles.originButton,
                {
                  backgroundColor: isSelected ? colors.primary : colors.surfaceSubtle,
                },
              ]}
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
    borderRadius: 6,
  },
  quickActionText: {
    fontSize: 12,
    fontFamily: Fonts?.sans,
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
    borderRadius: 20,
  },
  originText: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
  },
  originTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    fontFamily: Fonts?.sans,
    color: '#A89BB5',
    fontStyle: 'italic',
  },
});
