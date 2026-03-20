import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useQuery, useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/convex/_generated/api';
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
import { useTheme } from '@/contexts/theme-context';
import { GradientBackground } from '@/components/ui/gradient-background';
import { LoadingScreen, useGracefulLoading } from '@/components/ui/loading-screen';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
import { Doc, Id } from '@/convex/_generated/dataModel';

type TabType = 'liked' | 'rejected';

export default function Dashboard() {
  const { colors } = useTheme();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>('liked');
  const [searchInput, setSearchInput] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [likedSortBy, setLikedSortBy] = useState<SortOption>('liked_newest');
  const [rejectedSortBy, setRejectedSortBy] = useState<RejectedSortOption>('rejected_newest');

  // Multi-select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal state
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    name: Doc<'names'>;
    selectionId: Id<'selections'>;
  } | null>(null);

  // Reset search and select mode when switching tabs
  useEffect(() => {
    setSearchInput('');
    setSubmittedSearch('');
    setSelectMode(false);
    setSelectedIds(new Set());
  }, [activeTab]);

  const handleSearchSubmit = () => {
    setSubmittedSearch(searchInput);
  };

  const handleSearchClear = () => {
    setSubmittedSearch('');
  };

  const likedNames = useQuery(api.selections.getLikedNames, {
    search: submittedSearch || undefined,
    sortBy: likedSortBy,
  });

  const rejectedNames = useQuery(api.selections.getRejectedNames, {
    search: submittedSearch || undefined,
    sortBy: rejectedSortBy,
  });

  const removeFromLiked = useMutation(api.selections.removeFromLiked);
  const restoreToQueue = useMutation(api.selections.restoreToQueue);
  const hidePermanently = useMutation(api.selections.hidePermanently);
  const bulkDelete = useMutation(api.selections.bulkDeleteSelections);
  const bulkHide = useMutation(api.selections.bulkHideSelections);

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

  const toggleSelectMode = useCallback(() => {
    setSelectMode((prev) => !prev);
    setSelectedIds(new Set());
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const data = activeTab === 'liked' ? likedNames : rejectedNames;
    if (!data) return;
    const allIds = data.map((item) => item.selectionId);
    const allSelected = allIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  }, [selectedIds, activeTab, likedNames, rejectedNames]);

  const handleBulkDelete = useCallback(() => {
    const count = selectedIds.size;
    if (count === 0) return;

    const action = activeTab === 'liked' ? 'remove' : 'restore to queue';
    Alert.alert(
      `${activeTab === 'liked' ? 'Remove' : 'Restore'} ${count} Names`,
      `Are you sure you want to ${action} ${count} name${count > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: activeTab === 'liked' ? 'Remove' : 'Restore',
          style: activeTab === 'liked' ? 'destructive' : 'default',
          onPress: async () => {
            await bulkDelete({
              selectionIds: [...selectedIds] as Id<'selections'>[],
            });
            setSelectMode(false);
            setSelectedIds(new Set());
          },
        },
      ],
    );
  }, [selectedIds, activeTab, bulkDelete]);

  const handleBulkHide = useCallback(() => {
    const count = selectedIds.size;
    if (count === 0) return;

    Alert.alert(
      `Hide ${count} Names`,
      `Are you sure you want to permanently hide ${count} name${count > 1 ? 's' : ''}? They will never appear in your swipe queue again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Hide',
          style: 'destructive',
          onPress: async () => {
            await bulkHide({
              selectionIds: [...selectedIds] as Id<'selections'>[],
            });
            setSelectMode(false);
            setSelectedIds(new Set());
          },
        },
      ],
    );
  }, [selectedIds, bulkHide]);

  const currentData = activeTab === 'liked' ? likedNames : rejectedNames;

  const { showLoading, loadingProps } = useGracefulLoading(currentData !== undefined);

  if (showLoading) {
    return <LoadingScreen {...loadingProps} />;
  }

  // Data loading state
  if (currentData === undefined) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.flexContainer} edges={['top']}>
          <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
          {activeTab === 'liked' ? (
            <LikedNamesHeader count={0} sortBy={likedSortBy} onSortChange={setLikedSortBy} />
          ) : (
            <RejectedNamesHeader
              count={0}
              sortBy={rejectedSortBy}
              onSortChange={setRejectedSortBy}
            />
          )}
          <SearchInput
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmit={handleSearchSubmit}
            onClear={handleSearchClear}
          />
          <View style={styles.loadingContainer}>
            <LoadingIndicator size="small" />
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // Empty state
  if (currentData.length === 0) {
    const isSearching = submittedSearch.length > 0;
    return (
      <GradientBackground>
        <SafeAreaView style={styles.flexContainer} edges={['top']}>
          <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
          {activeTab === 'liked' ? (
            <LikedNamesHeader count={0} sortBy={likedSortBy} onSortChange={setLikedSortBy} />
          ) : (
            <RejectedNamesHeader
              count={0}
              sortBy={rejectedSortBy}
              onSortChange={setRejectedSortBy}
            />
          )}
          <SearchInput
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmit={handleSearchSubmit}
            onClear={handleSearchClear}
          />
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons
                name={
                  isSearching
                    ? 'search'
                    : activeTab === 'liked'
                      ? 'heart-outline'
                      : 'heart-dislike-outline'
                }
                size={64}
                color="#A89BB5"
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
                ? `No names match "${submittedSearch}"`
                : activeTab === 'liked'
                  ? 'Start swiping to add names to your liked list!'
                  : 'Names you swipe left on will appear here.'}
            </Text>
            {!isSearching && (
              <Pressable
                style={[styles.createButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/(tabs)/explore')}
              >
                <Ionicons
                  name={activeTab === 'liked' ? 'heart' : 'compass'}
                  size={24}
                  color="#fff"
                />
                <Text style={styles.createButtonText}>Start Swiping</Text>
              </Pressable>
            )}
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.flexContainer} edges={['top']}>
        <Animated.View entering={FadeInDown.duration(400).springify()}>
          <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
        </Animated.View>
        {activeTab === 'liked' ? (
          <>
            <Animated.View entering={FadeInDown.delay(100).duration(400).springify()}>
              <LikedNamesHeader
                count={likedNames?.length ?? 0}
                sortBy={likedSortBy}
                onSortChange={setLikedSortBy}
                selectMode={selectMode}
                onToggleSelectMode={toggleSelectMode}
                selectedCount={selectedIds.size}
                totalCount={likedNames?.length ?? 0}
                onSelectAll={handleSelectAll}
              />
              {!selectMode && (
                <SearchInput
                  value={searchInput}
                  onChangeText={setSearchInput}
                  onSubmit={handleSearchSubmit}
                  onClear={handleSearchClear}
                />
              )}
            </Animated.View>
            <FlatList
              data={likedNames}
              keyExtractor={(item) => item.selectionId}
              renderItem={({ item, index }) => (
                <Animated.View
                  entering={FadeInUp.delay(index * 50)
                    .duration(400)
                    .springify()}
                >
                  <LikedNameCard
                    name={item.name}
                    likedAt={item.likedAt}
                    onRemove={() => removeFromLiked({ selectionId: item.selectionId })}
                    onPress={() => handleCardPress(item.name, item.selectionId)}
                    selectMode={selectMode}
                    selected={selectedIds.has(item.selectionId)}
                    onToggleSelect={() => toggleSelect(item.selectionId)}
                  />
                </Animated.View>
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            />
          </>
        ) : (
          <>
            <Animated.View entering={FadeInDown.delay(100).duration(400).springify()}>
              <RejectedNamesHeader
                count={rejectedNames?.length ?? 0}
                sortBy={rejectedSortBy}
                onSortChange={setRejectedSortBy}
                selectMode={selectMode}
                onToggleSelectMode={toggleSelectMode}
                selectedCount={selectedIds.size}
                totalCount={rejectedNames?.length ?? 0}
                onSelectAll={handleSelectAll}
              />
              {!selectMode && (
                <SearchInput
                  value={searchInput}
                  onChangeText={setSearchInput}
                  onSubmit={handleSearchSubmit}
                  onClear={handleSearchClear}
                />
              )}
            </Animated.View>
            <FlatList
              data={rejectedNames}
              keyExtractor={(item) => item.selectionId}
              renderItem={({ item, index }) => (
                <Animated.View
                  entering={FadeInUp.delay(index * 50)
                    .duration(400)
                    .springify()}
                >
                  <RejectedNameCard
                    name={item.name}
                    rejectedAt={item.rejectedAt}
                    onRestore={() => restoreToQueue({ selectionId: item.selectionId })}
                    onHide={() => hidePermanently({ selectionId: item.selectionId })}
                    onPress={() => handleCardPress(item.name, item.selectionId)}
                    selectMode={selectMode}
                    selected={selectedIds.has(item.selectionId)}
                    onToggleSelect={() => toggleSelect(item.selectionId)}
                  />
                </Animated.View>
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            />
          </>
        )}

        {/* Floating bulk action bar */}
        {selectMode && selectedIds.size > 0 && (
          <Animated.View
            entering={FadeInDown.duration(300).springify()}
            style={styles.bulkActionBar}
          >
            {activeTab === 'liked' ? (
              <Pressable
                style={[styles.bulkActionButton, { backgroundColor: '#FF6B6B' }]}
                onPress={handleBulkDelete}
              >
                <Ionicons name="trash-outline" size={20} color="#fff" />
                <Text style={styles.bulkActionText}>Remove {selectedIds.size}</Text>
              </Pressable>
            ) : (
              <View style={styles.bulkActionRow}>
                <Pressable
                  style={[styles.bulkActionButton, { backgroundColor: colors.primary, flex: 1 }]}
                  onPress={handleBulkDelete}
                >
                  <Ionicons name="refresh-outline" size={20} color="#fff" />
                  <Text style={styles.bulkActionText}>Restore {selectedIds.size}</Text>
                </Pressable>
                <Pressable
                  style={[styles.bulkActionButton, { backgroundColor: '#FF6B6B', flex: 1 }]}
                  onPress={handleBulkHide}
                >
                  <Ionicons name="eye-off-outline" size={20} color="#fff" />
                  <Text style={styles.bulkActionText}>Hide {selectedIds.size}</Text>
                </Pressable>
              </View>
            )}
          </Animated.View>
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
    </GradientBackground>
  );
}

interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.tabBar}>
      <Pressable
        style={[styles.tab, activeTab === 'liked' && { backgroundColor: colors.primaryLight }]}
        onPress={() => onTabChange('liked')}
      >
        <Ionicons
          name={activeTab === 'liked' ? 'heart' : 'heart-outline'}
          size={20}
          color={activeTab === 'liked' ? colors.primary : '#6B5B7B'}
        />
        <Text
          style={[
            styles.tabText,
            activeTab === 'liked' && { color: colors.primary, fontWeight: '600' as const },
          ]}
        >
          Liked
        </Text>
      </Pressable>
      <Pressable
        style={[styles.tab, activeTab === 'rejected' && { backgroundColor: colors.primaryLight }]}
        onPress={() => onTabChange('rejected')}
      >
        <Ionicons
          name={activeTab === 'rejected' ? 'heart-dislike' : 'heart-dislike-outline'}
          size={20}
          color={activeTab === 'rejected' ? colors.primary : '#6B5B7B'}
        />
        <Text
          style={[
            styles.tabText,
            activeTab === 'rejected' && { color: colors.primary, fontWeight: '600' as const },
          ]}
        >
          Rejected
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
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
  tabText: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
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
    color: '#2D1B4E',
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    textAlign: 'center',
    lineHeight: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
    paddingBottom: 100,
  },
  bulkActionBar: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
  },
  bulkActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bulkActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  bulkActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
