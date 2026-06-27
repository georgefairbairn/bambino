import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/convex/_generated/api';
import { GenderFilterSelector } from '@/components/search/gender-filter-selector';
import { OriginToggleList } from '@/components/search/origin-toggle-list';
import { CategoryToggleList } from '@/components/search/category-toggle-list';
import { GradientBackground } from '@/components/ui/gradient-background';
import { SlotCounter } from '@/components/ui/slot-counter';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { Events, trackEvent } from '@/lib/analytics';

type GenderFilter = 'boy' | 'girl' | 'both';

export default function Filters() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useQuery(api.users.getCurrentUser);
  const updateFilters = useMutation(api.users.updateFilters);
  const markFiltersOpened = useMutation(api.users.markFiltersOpened);

  // First visit to this screen → show the explanatory banner. Capture the
  // decision once, BEFORE markFiltersOpened flips the flag, so a re-read of
  // `user` doesn't make the banner vanish on mount.
  const [showBanner, setShowBanner] = useState(false);
  const bannerDecided = useRef(false);
  useEffect(() => {
    if (bannerDecided.current || !user) return;
    bannerDecided.current = true;
    if (user.hasOpenedFilters !== true) setShowBanner(true);
    void markFiltersOpened();
  }, [user, markFiltersOpened]);

  const [genderFilter, setGenderFilter] = useState<GenderFilter>('both');
  // null = all origins, [] = none, [...] = specific
  const [originFilter, setOriginFilter] = useState<string[] | null>(null);
  // null = all categories, [...] = specific
  const [categoryFilter, setCategoryFilter] = useState<string[] | null>(null);
  // Load saved filters from DB exactly once (not on every user query update)
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current || !user) return;
    loaded.current = true;
    setGenderFilter((user.genderFilter as GenderFilter) ?? 'both');
    setOriginFilter(user.originFilter?.length ? user.originFilter : null);
    setCategoryFilter(user.categoryFilter?.length ? user.categoryFilter : null);
  }, [user]);

  // Refs track latest state so saveFilters can read current values
  const genderRef = useRef(genderFilter);
  const originRef = useRef(originFilter);
  const categoryRef = useRef(categoryFilter);
  genderRef.current = genderFilter;
  originRef.current = originFilter;
  categoryRef.current = categoryFilter;

  // Save explicitly — called by interaction handlers, never by effects
  const saveFilters = useCallback(
    async (gender: GenderFilter, origin: string[] | null, category: string[] | null) => {
      try {
        await updateFilters({
          genderFilter: gender,
          originFilter: origin ?? [],
          categoryFilter: category ?? [],
        });
        trackEvent(Events.FILTERS_CHANGED, {
          gender_filter: gender,
          origin_count: origin?.length ?? 0,
          all_origins: origin === null,
          category_count: category?.length ?? 0,
          all_categories: category === null,
        });
      } catch (error) {
        Sentry.captureException(error);
        Alert.alert('Error', 'Failed to save filters. Please try again.');
      }
    },
    [updateFilters],
  );

  // Debounce the mutation so rapidly toggling N origins is ~1 write, not N
  // (#190). Local state still updates immediately, so the live name count below
  // stays instant — only the persisted write is coalesced.
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueSave = useCallback(
    (gender: GenderFilter, origin: string[] | null, category: string[] | null) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        saveFilters(gender, origin, category);
      }, 400);
    },
    [saveFilters],
  );

  // Flush a pending save when leaving the screen so a quick exit (back button)
  // doesn't drop the last change.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        saveFilters(genderRef.current, originRef.current, categoryRef.current);
      }
    };
  }, [saveFilters]);

  const handleGenderChange = useCallback(
    (value: GenderFilter) => {
      setGenderFilter(value);
      queueSave(value, originRef.current, categoryRef.current);
    },
    [queueSave],
  );

  const handleOriginChange = useCallback(
    (value: string[] | null) => {
      setOriginFilter(value);
      queueSave(genderRef.current, value, categoryRef.current);
    },
    [queueSave],
  );

  const handleCategoryChange = useCallback(
    (value: string[] | null) => {
      setCategoryFilter(value);
      queueSave(genderRef.current, originRef.current, value);
    },
    [queueSave],
  );

  // Live names count based on current filter state
  // null → omit originFilter (all origins), array → pass it
  const nameCount = useQuery(api.names.getFilteredNameCount, {
    genderFilter,
    ...(originFilter !== null ? { originFilter } : {}),
    ...(categoryFilter !== null ? { categoryFilter } : {}),
  });

  // Keep previous count alive during query transitions so SlotCounter
  // never unmounts (which would reset its animation refs)
  const lastCount = useRef<number | undefined>(undefined);
  if (nameCount !== undefined) {
    lastCount.current = nameCount;
  }
  const displayCount = nameCount ?? lastCount.current;

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
          {/* First-visit explainer banner */}
          {showBanner && (
            <View
              style={[
                styles.banner,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
              ]}
            >
              <Text style={styles.bannerText}>
                Filter by gender, origin, or category to see names that fit you.
              </Text>
              <Pressable
                onPress={() => setShowBanner(false)}
                accessibilityLabel="Dismiss"
                accessibilityRole="button"
                hitSlop={8}
              >
                <Ionicons name="close" size={18} color="#6B5B7B" />
              </Pressable>
            </View>
          )}

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
            <GenderFilterSelector value={genderFilter} onChange={handleGenderChange} />
          </View>

          {/* Category filter — toggle list renders its own section title */}
          <CategoryToggleList value={categoryFilter} onChange={handleCategoryChange} />

          {/* Origin filter — toggle list handles its own section title */}
          <OriginToggleList
            value={originFilter}
            onChange={handleOriginChange}
            genderFilter={genderFilter}
          />
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
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: '#2D1B4E',
    lineHeight: 18,
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
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    fontSize: 28,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#2D1B4E',
  },
});
