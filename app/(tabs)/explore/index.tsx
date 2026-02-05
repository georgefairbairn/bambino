import { useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from 'convex/react';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { SearchCard } from '@/components/search/search-card';
import { JoinSearchModal } from '@/components/search/join-search-modal';
import { Fonts } from '@/constants/theme';

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
  const searches = useQuery(api.searches.getUserSearches) as SearchWithRole[] | undefined;

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
  if (searches === undefined) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0a7ea4" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Searches</Text>
        <Pressable style={styles.joinButton} onPress={handleJoinPress}>
          <Ionicons name="enter-outline" size={18} color="#0a7ea4" />
          <Text style={styles.joinButtonText}>Join</Text>
        </Pressable>
      </View>

      {/* Search list */}
      <FlatList
        data={searches}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <SearchCardWithStats
            search={item}
            onPress={() => handleSearchPress(item)}
            onMenuPress={() => handleMenuPress(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No searches yet</Text>
            <Text style={styles.emptySubtext}>Create a search to start swiping on names</Text>
          </View>
        }
      />

      {/* FAB */}
      <Pressable style={styles.fab} onPress={handleCreatePress}>
        <Ionicons name="add" size={28} color="#ffffff" />
      </Pressable>

      {/* Join Modal */}
      <JoinSearchModal
        visible={joinModalVisible}
        onClose={() => setJoinModalVisible(false)}
        onSuccess={handleJoinSuccess}
      />
    </SafeAreaView>
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
  container: {
    flex: 1,
    backgroundColor: '#C6E7F5',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#1a1a1a',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#e0f2fe',
    borderRadius: 8,
  },
  joinButtonText: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#0a7ea4',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#6b7280',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0a7ea4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
