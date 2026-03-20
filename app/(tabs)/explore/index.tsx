import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { SwipeCardStack } from '@/components/swipe/swipe-card-stack';
import { ExploreHeader } from '@/components/swipe/explore-header';
import { GradientBackground } from '@/components/ui/gradient-background';
import { LoadingScreen, useGracefulLoading } from '@/components/ui/loading-screen';

export default function ExploreView() {
  const router = useRouter();
  const user = useQuery(api.users.getCurrentUser);
  const stats = useQuery(api.selections.getSelectionStats);

  const swipeQueueKey = useMemo(() => {
    if (!user) return '';
    const originKey = (user.originFilter ?? []).sort().join(',');
    return `${user.genderFilter ?? 'both'}-${originKey}-${user.updatedAt}`;
  }, [user]);

  const { showLoading, loadingProps } = useGracefulLoading(user !== undefined);

  if (showLoading) {
    return <LoadingScreen {...loadingProps} />;
  }

  if (!user) {
    return <LoadingScreen isLoading />;
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.flexContainer} edges={['top']}>
        <ExploreHeader
          liked={stats?.liked ?? 0}
          onFilterPress={() => router.push('/(tabs)/explore/filters')}
        />
        <SwipeCardStack key={swipeQueueKey} />
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
  },
});
