import { useState, useCallback } from 'react';
import { Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useQuery } from 'convex/react';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { SearchCard } from '@/components/search/search-card';
import { JoinSearchModal } from '@/components/search/join-search-modal';
import { Fonts } from '@/constants/theme';
import { GradientBackground } from '@/components/ui/gradient-background';
import { LoadingScreen, useGracefulLoading } from '@/components/ui/loading-screen';
import { useTheme } from '@/contexts/theme-context';

type GenderFilter = 'boy' | 'girl' | 'both';

interface SearchWithRole {
  _id: Id<'searches'>;
  name: string;
  genderFilter: GenderFilter;
  originFilter?: string[];
  role: 'owner' | 'partner';
  shareCode: string;
  status: 'active' | 'archived';
  ownerId: Id<'users'>;
  createdAt: number;
  updatedAt: number;
  partnerName?: string;
}

export default function SearchList() {
  const router = useRouter();
  const { colors } = useTheme();
  const searches = useQuery(api.searches.getUserSearches) as SearchWithRole[] | undefined;
  const { showLoading, loadingProps } = useGracefulLoading(searches !== undefined);

  const [joinModalVisible, setJoinModalVisible] = useState(false);

  const handleSearchPress = useCallback(
    (search: SearchWithRole) => {
      router.push(`/(tabs)/explore/${search._id}`);
    },
    [router],
  );

  const handleMenuPress = useCallback(
    (search: SearchWithRole) => {
      router.push(`/(tabs)/explore/${search._id}/edit`);
    },
    [router],
  );

  const handleCreatePress = useCallback(() => {
    router.push('/(tabs)/explore/new');
  }, [router]);

  const handleJoinPress = useCallback(() => {
    setJoinModalVisible(true);
  }, []);

  const handleJoinSuccess = useCallback(
    (searchId: string) => {
      router.push(`/(tabs)/explore/${searchId}`);
    },
    [router],
  );

  // Loading state
  if (showLoading) {
    return <LoadingScreen {...loadingProps} />;
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.flexContainer} edges={['top']}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.header}>
          <Text style={styles.title}>Searches</Text>
          <Pressable
            style={[styles.joinButton, { backgroundColor: colors.primaryLight }]}
            onPress={handleJoinPress}
          >
            <Ionicons name="enter-outline" size={18} color={colors.primary} />
            <Text style={[styles.joinButtonText, { color: colors.primary }]}>Join</Text>
          </Pressable>
        </Animated.View>

        {/* Search list */}
        <FlatList
          data={searches}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInUp.delay(index * 80)
                .duration(400)
                .springify()}
            >
              <SearchCardWithStats
                search={item}
                onPress={() => handleSearchPress(item)}
                onMenuPress={() => handleMenuPress(item)}
              />
            </Animated.View>
          )}
          ListEmptyComponent={
            <Animated.View
              entering={FadeInUp.delay(200).duration(500)}
              style={styles.emptyContainer}
            >
              <Text style={styles.emptyText}>No searches yet</Text>
              <Text style={styles.emptySubtext}>Create a search to start swiping on names</Text>
            </Animated.View>
          }
        />

        {/* FAB */}
        <Animated.View
          entering={ZoomIn.delay(400).duration(300).springify()}
          style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.secondary }]}
        >
          <Pressable style={styles.fabInner} onPress={handleCreatePress}>
            <Ionicons name="add" size={28} color="#ffffff" />
          </Pressable>
        </Animated.View>

        {/* Join Modal */}
        <JoinSearchModal
          visible={joinModalVisible}
          onClose={() => setJoinModalVisible(false)}
          onSuccess={handleJoinSuccess}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

// Separate component to fetch stats per search
function SearchCardWithStats({
  search,
  onPress,
  onMenuPress,
}: {
  search: SearchWithRole;
  onPress: () => void;
  onMenuPress: () => void;
}) {
  const stats = useQuery(api.selections.getSelectionStats, {
    searchId: search._id,
  });

  return (
    <SearchCard
      name={search.name}
      genderFilter={search.genderFilter}
      role={search.role}
      partnerName={search.partnerName}
      stats={{
        total: stats?.total ?? 0,
        liked: stats?.liked ?? 0,
      }}
      onPress={onPress}
      onMenuPress={onMenuPress}
    />
  );
}

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#2D1B4E',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinButtonText: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    gap: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#2D1B4E',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
