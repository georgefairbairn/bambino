import { useState } from 'react';
import { View, Text, Switch, Pressable, StyleSheet } from 'react-native';
import { useQuery } from 'convex/react';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/convex/_generated/api';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
import { OriginToggleRow } from '@/components/search/origin-toggle-row';

interface OriginToggleListProps {
  value: string[];
  onChange: (origins: string[]) => void;
}

export function OriginToggleList({ value, onChange }: OriginToggleListProps) {
  const { colors } = useTheme();
  const availableOrigins = useQuery(api.names.getAvailableOrigins);
  const originCounts = useQuery(api.names.getOriginCounts);
  const [collapsed, setCollapsed] = useState(false);

  const isAllSelected = value.length === 0;
  const selectedSet = new Set(value);
  const selectedCount = value.length;

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: withTiming(collapsed ? '0deg' : '180deg', { duration: 250 }) }],
  }));

  if (availableOrigins === undefined || originCounts === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingIndicator size="small" />
      </View>
    );
  }

  // All ON → OFF: enter explicit mode (all origins listed individually).
  // All OFF → ON: back to [] (implicit all).
  const handleToggleAll = () => {
    if (isAllSelected) {
      onChange([...availableOrigins]);
    } else {
      onChange([]);
    }
  };

  const handleToggleOrigin = (origin: string) => {
    if (isAllSelected) {
      // From "all" state: select all EXCEPT this one
      const allExcept = availableOrigins.filter((o) => o !== origin);
      onChange(allExcept);
    } else if (selectedSet.has(origin)) {
      // Remove this origin — but prevent deselecting the last one ([] = all in backend)
      const next = value.filter((o) => o !== origin);
      if (next.length === 0) return;
      onChange(next);
    } else {
      // Add this origin — if all are now selected, switch back to implicit all
      const next = [...value, origin].sort();
      if (next.length === availableOrigins.length) {
        onChange([]);
      } else {
        onChange(next);
      }
    }
  };

  const isOriginActive = (origin: string) => isAllSelected || selectedSet.has(origin);

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
      {/* Collapsible header */}
      <Pressable style={styles.header} onPress={() => setCollapsed(!collapsed)}>
        <View style={styles.headerLeft}>
          <Text style={styles.sectionTitle}>Origin</Text>
          <View style={[styles.badge, { backgroundColor: badgeStyle.backgroundColor }]}>
            <Text style={[styles.badgeText, { color: badgeStyle.color }]}>{badgeText}</Text>
          </View>
        </View>
        <Animated.View style={chevronStyle}>
          <Ionicons name="chevron-down" size={16} color="#A89BB5" />
        </Animated.View>
      </Pressable>

      {/* Collapsible body */}
      {!collapsed && (
        <View style={styles.body}>
          {/* All Origins master row */}
          <View style={styles.allRow}>
            <View>
              <Text style={styles.allRowLabel}>All Origins</Text>
              <Text style={styles.allRowSub}>Include every origin</Text>
            </View>
            <Switch
              value={isAllSelected}
              onValueChange={handleToggleAll}
              trackColor={{ false: 'rgba(255,255,255,0.25)', true: colors.primary }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="rgba(255,255,255,0.25)"
            />
          </View>

          {/* Individual origin rows */}
          {availableOrigins.map((origin) => (
            <OriginToggleRow
              key={origin}
              origin={origin}
              count={originCounts[origin] ?? 0}
              isActive={isOriginActive(origin)}
              onToggle={() => handleToggleOrigin(origin)}
            />
          ))}
        </View>
      )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
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
    backgroundColor: '#2D1B4E',
    borderRadius: 16,
    shadowColor: 'rgba(45, 27, 78, 0.15)',
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  allRowLabel: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  allRowSub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
});
