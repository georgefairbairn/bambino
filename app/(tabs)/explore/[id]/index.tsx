import { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from 'convex/react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { SwipeCardStack } from '@/components/swipe/swipe-card-stack';
import { SearchHeader } from '@/components/swipe/search-header';
import { useActiveSearch } from '@/hooks/use-active-search';
import { GradientBackground } from '@/components/ui/gradient-background';
import { LoadingScreen, useGracefulLoading } from '@/components/ui/loading-screen';
import { useTheme } from '@/contexts/theme-context';

export default function SwipeView() {
  const router = useRouter();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const searchId = id as Id<'searches'>;

  const { setActiveSearch, clearActiveSearch, isLoading: isSearchLoading } = useActiveSearch();
  const searches = useQuery(api.searches.getUserSearches);

  // Find the search from the list
  const activeSearch = searches?.find((s) => s._id === searchId);

  // Set this search as active when viewing
  useEffect(() => {
    if (searchId && !isSearchLoading) {
      setActiveSearch(searchId);
    }
  }, [searchId, isSearchLoading, setActiveSearch]);

  // Clear stale search if it doesn't exist
  useEffect(() => {
    if (searches && searchId && !isSearchLoading) {
      const searchExists = searches.some((s) => s._id === searchId);
      if (!searchExists) {
        clearActiveSearch();
        router.replace('/(tabs)/explore');
      }
    }
  }, [searches, searchId, isSearchLoading, clearActiveSearch, router]);

  const stats = useQuery(
    api.selections.getSelectionStats,
    activeSearch ? { searchId: activeSearch._id } : 'skip',
  );

  // Key to reset SwipeCardStack when search or filters change
  const swipeQueueKey = useMemo(() => {
    if (!activeSearch) return '';
    const originKey = (activeSearch.originFilter ?? []).sort().join(',');
    return `${activeSearch._id}-${activeSearch.genderFilter}-${originKey}-${activeSearch.updatedAt}`;
  }, [activeSearch]);

  const { showLoading, loadingProps } = useGracefulLoading(searches !== undefined);

  // Loading state
  if (showLoading) {
    return <LoadingScreen {...loadingProps} />;
  }

  // Search not found state
  if (!activeSearch) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.flexContainer} edges={['top']}>
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="search-outline" size={64} color="#A89BB5" />
            </View>
            <Text style={styles.emptyTitle}>Search Not Found</Text>
            <Text style={styles.emptyDescription}>
              This search may have been deleted or you don&apos;t have access.
            </Text>
            <Pressable
              style={[styles.backButton, { backgroundColor: colors.primary }]}
              onPress={() => router.replace('/(tabs)/explore')}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
              <Text style={styles.backButtonText}>Back to Searches</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.flexContainer} edges={['top']}>
        <SearchHeader searchName={activeSearch.name} liked={stats?.liked ?? 0} />
        <SwipeCardStack key={swipeQueueKey} searchId={activeSearch._id} />
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2D1B4E',
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B5B7B',
    textAlign: 'center',
    lineHeight: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
