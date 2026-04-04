import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/convex/_generated/api';
import { GenderFilterSelector } from '@/components/search/gender-filter-selector';
import { OriginToggleList } from '@/components/search/origin-toggle-list';
import { GradientBackground } from '@/components/ui/gradient-background';
import { SlotCounter } from '@/components/ui/slot-counter';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

type GenderFilter = 'boy' | 'girl' | 'both';

export default function Filters() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useQuery(api.users.getCurrentUser);
  const updateFilters = useMutation(api.users.updateFilters);

  const [genderFilter, setGenderFilter] = useState<GenderFilter>('both');
  // null = all origins, [] = none, [...] = specific
  const [originFilter, setOriginFilter] = useState<string[] | null>(null);
  // Track whether initial state has loaded from DB to avoid saving on mount
  const initialized = useRef(false);

  // Live names count based on current filter state
  // null → omit originFilter (all origins), array → pass it
  const nameCount = useQuery(api.names.getFilteredNameCount, {
    genderFilter,
    ...(originFilter !== null ? { originFilter } : {}),
  });

  // Keep previous count alive during query transitions so SlotCounter
  // never unmounts (which would reset its animation refs)
  const lastCount = useRef<number | undefined>(undefined);
  if (nameCount !== undefined) {
    lastCount.current = nameCount;
  }
  const displayCount = nameCount ?? lastCount.current;

  // Load saved filters from DB
  useEffect(() => {
    if (user) {
      setGenderFilter((user.genderFilter as GenderFilter) ?? 'both');
      const saved = user.originFilter;
      setOriginFilter(!saved || saved.length === 0 ? null : saved);
      // Mark initialized after a tick so the auto-save effect doesn't fire
      setTimeout(() => { initialized.current = true; }, 0);
    }
  }, [user]);

  // Auto-save whenever filters change (after initial load)
  const save = useCallback(() => {
    if (!initialized.current) return;
    updateFilters({ genderFilter, originFilter: originFilter ?? [] });
  }, [genderFilter, originFilter, updateFilters]);

  useEffect(() => {
    save();
  }, [save]);

  // Counter sublabel
  const isAllOrigins = originFilter === null;
  const originCount = originFilter?.length ?? 0;
  const counterSub = isAllOrigins
    ? 'All origins'
    : `${originCount} origin${originCount !== 1 ? 's' : ''} selected`;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.flexContainer} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={[styles.backButton, { shadowColor: colors.secondary }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#2D1B4E" />
          </Pressable>
          <Text style={styles.title}>Filters</Text>
          <View style={styles.spacer} />
        </View>

        {/* Scrollable content */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Names counter card */}
          <View
            style={[
              styles.counterCard,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.border,
                shadowColor: colors.secondary,
              },
            ]}
          >
            <View>
              <Text style={styles.counterLabel}>Names available</Text>
              <Text style={styles.counterSub}>{counterSub}</Text>
            </View>
            {displayCount !== undefined ? (
              <SlotCounter
                value={displayCount}
                fontSize={28}
                textStyle={[styles.counterNum, { color: colors.primary }]}
              />
            ) : (
              <Text style={[styles.counterNum, { color: colors.primary }]}>—</Text>
            )}
          </View>

          {/* Gender filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gender</Text>
            <GenderFilterSelector value={genderFilter} onChange={setGenderFilter} />
          </View>

          {/* Origin filter — toggle list handles its own section title */}
          <OriginToggleList value={originFilter} onChange={setOriginFilter} genderFilter={genderFilter} />
        </ScrollView>

      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    fontFamily: Fonts?.display,
    fontSize: 20,
    color: '#2D1B4E',
  },
  spacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
    gap: 28,
  },
  counterCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  counterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2D1B4E',
  },
  counterSub: {
    fontSize: 11,
    color: '#6B5B7B',
    marginTop: 2,
  },
  counterNum: {
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    fontSize: 28,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#2D1B4E',
  },
});
