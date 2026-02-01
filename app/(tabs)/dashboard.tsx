import { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/convex/_generated/api';
import { useActiveSession } from '@/hooks/use-active-session';
import { LikedNamesHeader, SortOption } from '@/components/dashboard/liked-names-header';
import {
  RejectedNamesHeader,
  RejectedSortOption,
} from '@/components/dashboard/rejected-names-header';
import { SearchInput } from '@/components/dashboard/search-input';
import { LikedNameCard } from '@/components/dashboard/liked-name-card';
import { RejectedNameCard } from '@/components/dashboard/rejected-name-card';
import { NameDetailModal } from '@/components/name-detail/name-detail-modal';
import { Fonts } from '@/constants/theme';
import { Doc, Id } from '@/convex/_generated/dataModel';

type TabType = 'liked' | 'rejected';

export default function Dashboard() {
  const sessions = useQuery(api.sessions.getUserSessions);
  const {
    activeSessionId,
    setActiveSession,
    clearActiveSession,
    isLoading: isSessionLoading,
  } = useActiveSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>('liked');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [likedSortBy, setLikedSortBy] = useState<SortOption>('liked_newest');
  const [rejectedSortBy, setRejectedSortBy] = useState<RejectedSortOption>('rejected_newest');

  // Modal state
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    name: Doc<'names'>;
    selectionId: Id<'selections'>;
  } | null>(null);

  // Find active session from context, fallback to first session
  const activeSession = sessions?.find((s) => s._id === activeSessionId) ?? sessions?.[0];

  // Clear stale activeSessionId when it doesn't match any session
  useEffect(() => {
    if (sessions && activeSessionId && !isSessionLoading) {
      const sessionExists = sessions.some((s) => s._id === activeSessionId);
      if (!sessionExists) {
        clearActiveSession();
      }
    }
  }, [sessions, activeSessionId, isSessionLoading, clearActiveSession]);

  // If no active session is set but we have sessions, set the first one as active
  useEffect(() => {
    if (sessions && sessions.length > 0 && !activeSessionId && !isSessionLoading) {
      setActiveSession(sessions[0]._id);
    }
  }, [sessions, activeSessionId, isSessionLoading, setActiveSession]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset search when switching tabs
  useEffect(() => {
    setSearchInput('');
    setDebouncedSearch('');
  }, [activeTab]);

  const likedNames = useQuery(
    api.selections.getLikedNames,
    activeSession?._id
      ? { sessionId: activeSession._id, search: debouncedSearch || undefined, sortBy: likedSortBy }
      : 'skip',
  );

  const rejectedNames = useQuery(
    api.selections.getRejectedNames,
    activeSession?._id
      ? {
          sessionId: activeSession._id,
          search: debouncedSearch || undefined,
          sortBy: rejectedSortBy,
        }
      : 'skip',
  );

  const removeFromLiked = useMutation(api.selections.removeFromLiked);
  const restoreToQueue = useMutation(api.selections.restoreToQueue);
  const hidePermanently = useMutation(api.selections.hidePermanently);

  // Modal handlers
  const handleCardPress = (name: Doc<'names'>, selectionId: Id<'selections'>) => {
    setSelectedItem({ name, selectionId });
    setDetailModalVisible(true);
  };

  const handleModalRemove = async () => {
    if (!selectedItem) return;
    setDetailModalVisible(false);
    await removeFromLiked({ selectionId: selectedItem.selectionId });
    setSelectedItem(null);
  };

  const handleModalRestore = async () => {
    if (!selectedItem) return;
    setDetailModalVisible(false);
    await restoreToQueue({ selectionId: selectedItem.selectionId });
    setSelectedItem(null);
  };

  const handleModalHide = async () => {
    if (!selectedItem) return;
    setDetailModalVisible(false);
    await hidePermanently({ selectionId: selectedItem.selectionId });
    setSelectedItem(null);
  };

  // Loading state
  if (sessions === undefined) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0a7ea4" />
        </View>
      </SafeAreaView>
    );
  }

  // No sessions state
  if (sessions.length === 0 || !activeSession) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="heart-outline" size={64} color="#9ca3af" />
          </View>
          <Text style={styles.emptyTitle}>No Session Selected</Text>
          <Text style={styles.emptyDescription}>
            Create or select a session to view your liked names.
          </Text>
          <Pressable style={styles.createButton} onPress={() => router.push('/(tabs)/sessions')}>
            <Ionicons name="albums" size={24} color="#fff" />
            <Text style={styles.createButtonText}>Go to Sessions</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const currentData = activeTab === 'liked' ? likedNames : rejectedNames;

  // Data loading state
  if (currentData === undefined) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
        {activeTab === 'liked' ? (
          <LikedNamesHeader count={0} sortBy={likedSortBy} onSortChange={setLikedSortBy} />
        ) : (
          <RejectedNamesHeader count={0} sortBy={rejectedSortBy} onSortChange={setRejectedSortBy} />
        )}
        <SearchInput value={searchInput} onChangeText={setSearchInput} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0a7ea4" />
        </View>
      </SafeAreaView>
    );
  }

  // Empty state
  if (currentData.length === 0) {
    const isSearching = debouncedSearch.length > 0;
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
        {activeTab === 'liked' ? (
          <LikedNamesHeader count={0} sortBy={likedSortBy} onSortChange={setLikedSortBy} />
        ) : (
          <RejectedNamesHeader count={0} sortBy={rejectedSortBy} onSortChange={setRejectedSortBy} />
        )}
        <SearchInput value={searchInput} onChangeText={setSearchInput} />
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons
              name={
                isSearching
                  ? 'search'
                  : activeTab === 'liked'
                    ? 'heart-outline'
                    : 'close-circle-outline'
              }
              size={64}
              color="#9ca3af"
            />
          </View>
          <Text style={styles.emptyTitle}>
            {isSearching
              ? 'No Results Found'
              : activeTab === 'liked'
                ? 'No Liked Names Yet'
                : 'No Rejected Names'}
          </Text>
          <Text style={styles.emptyDescription}>
            {isSearching
              ? `No names match "${debouncedSearch}"`
              : activeTab === 'liked'
                ? 'Start swiping to add names to your liked list!'
                : 'Names you swipe left on will appear here.'}
          </Text>
          {!isSearching && (
            <Pressable style={styles.createButton} onPress={() => router.push('/(tabs)')}>
              <Ionicons name={activeTab === 'liked' ? 'heart' : 'albums'} size={24} color="#fff" />
              <Text style={styles.createButtonText}>Start Swiping</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === 'liked' ? (
        <>
          <LikedNamesHeader
            count={likedNames?.length ?? 0}
            sortBy={likedSortBy}
            onSortChange={setLikedSortBy}
          />
          <SearchInput value={searchInput} onChangeText={setSearchInput} />
          <FlatList
            data={likedNames}
            keyExtractor={(item) => item.selectionId}
            renderItem={({ item }) => (
              <LikedNameCard
                name={item.name}
                likedAt={item.likedAt}
                onRemove={() => removeFromLiked({ selectionId: item.selectionId })}
                onPress={() => handleCardPress(item.name, item.selectionId)}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        <>
          <RejectedNamesHeader
            count={rejectedNames?.length ?? 0}
            sortBy={rejectedSortBy}
            onSortChange={setRejectedSortBy}
          />
          <SearchInput value={searchInput} onChangeText={setSearchInput} />
          <FlatList
            data={rejectedNames}
            keyExtractor={(item) => item.selectionId}
            renderItem={({ item }) => (
              <RejectedNameCard
                name={item.name}
                rejectedAt={item.rejectedAt}
                onRestore={() => restoreToQueue({ selectionId: item.selectionId })}
                onHide={() => hidePermanently({ selectionId: item.selectionId })}
                onPress={() => handleCardPress(item.name, item.selectionId)}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}

      {/* Name detail modal */}
      <NameDetailModal
        visible={detailModalVisible}
        name={selectedItem?.name ?? null}
        context={activeTab}
        onClose={() => {
          setDetailModalVisible(false);
          setSelectedItem(null);
        }}
        onRemove={activeTab === 'liked' ? handleModalRemove : undefined}
        onRestore={activeTab === 'rejected' ? handleModalRestore : undefined}
        onHide={activeTab === 'rejected' ? handleModalHide : undefined}
      />
    </SafeAreaView>
  );
}

interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <View style={styles.tabBar}>
      <Pressable
        style={[styles.tab, activeTab === 'liked' && styles.tabActive]}
        onPress={() => onTabChange('liked')}
      >
        <Ionicons
          name={activeTab === 'liked' ? 'heart' : 'heart-outline'}
          size={20}
          color={activeTab === 'liked' ? '#0a7ea4' : '#6b7280'}
        />
        <Text style={[styles.tabText, activeTab === 'liked' && styles.tabTextActive]}>Liked</Text>
      </Pressable>
      <Pressable
        style={[styles.tab, activeTab === 'rejected' && styles.tabActive]}
        onPress={() => onTabChange('rejected')}
      >
        <Ionicons
          name={activeTab === 'rejected' ? 'close-circle' : 'close-circle-outline'}
          size={20}
          color={activeTab === 'rejected' ? '#ef4444' : '#6b7280'}
        />
        <Text style={[styles.tabText, activeTab === 'rejected' && styles.tabTextActive]}>
          Rejected
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#C6E7F5',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#e0f2fe',
  },
  tabText: {
    fontSize: 14,
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#0a7ea4',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
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
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#1f2937',
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    fontFamily: Fonts?.serif || 'Sanchez_400Regular',
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a7ea4',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  listContent: {
    paddingBottom: 16,
  },
});
