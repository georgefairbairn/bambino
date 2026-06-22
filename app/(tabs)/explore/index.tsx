import { useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useQuery } from 'convex/react';
import { trackScreen } from '@/lib/analytics';
import { api } from '@/convex/_generated/api';
import { SwipeCardStack } from '@/components/swipe/swipe-card-stack';
import { ExploreHeader } from '@/components/swipe/explore-header';
import { ErrorBoundary } from '@/components/error-boundary';
import { GradientBackground } from '@/components/ui/gradient-background';
import { LoadingScreen } from '@/components/ui/loading-screen';

export default function ExploreView() {
  const router = useRouter();
  const user = useQuery(api.users.getCurrentUser);
  const stats = useQuery(api.selections.getSelectionStats);

  useFocusEffect(
    useCallback(() => {
      trackScreen('Explore');
    }, []),
  );

  // Remount the swipe stack only when the FILTERS change — gender/origin/category
  // are the inputs to getSwipeQueue's result set, so a fresh seed/queue is only
  // warranted then. Deliberately excludes user.updatedAt: it's bumped by
  // every unrelated user-row write (push-token registration on tab mount,
  // onboarding completion, name confirmation, createOrUpdateUser), each of
  // which would otherwise remount the stack mid-session and flash the loading
  // screen — cards -> loading -> cards.
  const swipeQueueKey = useMemo(() => {
    if (!user) return '';
    const originKey = (user.originFilter ?? []).sort().join(',');
    const categoryKey = (user.categoryFilter ?? []).sort().join(',');
    return `${user.genderFilter ?? 'both'}-${originKey}-${categoryKey}`;
  }, [user]);

  const activeFilterCount = useMemo(() => {
    if (!user) return 0;
    let count = 0;
    if (user.genderFilter && user.genderFilter !== 'both') count += 1;
    if (user.originFilter) count += user.originFilter.length;
    if (user.categoryFilter) count += user.categoryFilter.length;
    return count;
  }, [user]);

  // The tabs-layout gate (app/(tabs)/_layout.tsx) already holds the loader
  // until getCurrentUser resolves, so `user` is a cached Doc by the time this
  // screen mounts — no graceful-loading dance needed. Keep a cheap guard for
  // the edge where the row briefly goes null (e.g. account deletion).
  if (!user) {
    return <LoadingScreen isLoading />;
  }

  return (
    // No entrance fade: this screen mounts straight out of the full-screen
    // loader (same gradient), so fading it in re-flashes the background.
    <GradientBackground animateEntrance={false}>
      <SafeAreaView style={styles.flexContainer} edges={['top']}>
        <ExploreHeader
          liked={stats?.liked ?? 0}
          activeFilterCount={activeFilterCount}
          onFilterPress={() => router.push('/(tabs)/explore/filters')}
        />
        <ErrorBoundary>
          <SwipeCardStack key={swipeQueueKey} />
        </ErrorBoundary>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
  },
});
