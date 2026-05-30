import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Sentry from '@sentry/react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { useRouter, useFocusEffect } from 'expo-router';
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
import { Paywall } from '@/components/paywall';
import { useEffectivePremium } from '@/hooks/use-effective-premium';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { trackScreen } from '@/lib/analytics';
import { GradientBackground } from '@/components/ui/gradient-background';
import { BubblePillsBackground } from '@/components/ui/bubble-pills-background';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
import { Doc, Id } from '@/convex/_generated/dataModel';

type TabType = 'liked' | 'rejected';
const BULK_BATCH_SIZE = 25;
// Pagination batch size for liked/rejected queries (#170). Tuned for the
// dashboard list — large enough that most users finish in 1-2 pages, small
// enough that scrolling fast doesn't create a perceptible "load more"
// pause for typical engagement levels.
const LIST_PAGE_SIZE = 100;

function formatTimeRemaining(endsAt: number): string {
  const remaining = Math.max(0, endsAt - Date.now());
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return 'soon';
}

export default function Dashboard() {
  const { colors } = useTheme();
  const router = useRouter();
  const { gracePeriodEndsAt, isPremium } = useEffectivePremium();

  const [activeTab, setActiveTab] = useState<TabType>('liked');
  const [showPaywall, setShowPaywall] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [likedSortBy, setLikedSortBy] = useState<SortOption>('liked_newest');
  const [rejectedSortBy, setRejectedSortBy] = useState<RejectedSortOption>('rejected_newest');

  // Multi-select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'delete' | 'hide' | null>(null);
  const bulkLoadingRef = useRef(false);

  // Track initial mount so header animations only play once
  const hasAnimated = useRef(false);
  useEffect(() => {
    hasAnimated.current = true;
  }, []);

  // Modal state
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    name: Doc<'names'>;
    selectionId: Id<'selections'>;
  } | null>(null);

  // Reset search and select mode when switching liked/rejected tabs
  useEffect(() => {
    setSearchInput('');
    setSubmittedSearch('');
    setSelectMode(false);
    setSelectedIds(new Set());
  }, [activeTab]);

  // Clear search when returning to this tab from another tab
  useFocusEffect(
    useCallback(() => {
      trackScreen('Dashboard');
      setSearchInput('');
      setSubmittedSearch('');
      setSelectMode(false);
      setSelectedIds(new Set());
    }, []),
  );

  const handleSearchSubmit = () => {
    setSubmittedSearch(searchInput);
  };

  const handleSearchClear = () => {
    setSubmittedSearch('');
  };

  // Paginated lists (#170). usePaginatedQuery streams pages of LIST_PAGE_SIZE
  // and exposes `loadMore` for FlatList's onEndReached. Status is one of
  // "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted". The
  // hook flattens pages into a single results array for us.
  const {
    results: allLikedItems,
    status: likedStatus,
    loadMore: loadMoreLiked,
  } = usePaginatedQuery(
    api.selections.getLikedNamesPaginated,
    { sortBy: likedSortBy },
    { initialNumItems: LIST_PAGE_SIZE },
  );
  const {
    results: allRejectedItems,
    status: rejectedStatus,
    loadMore: loadMoreRejected,
  } = usePaginatedQuery(
    api.selections.getRejectedNamesPaginated,
    { sortBy: rejectedSortBy },
    { initialNumItems: LIST_PAGE_SIZE },
  );

  // Counts come from the running counters (#183) — independent of how many
  // pages have loaded so the header always shows the true total.
  const stats = useQuery(api.selections.getSelectionStats);
  const totalLikedCount = stats?.liked ?? 0;
  const totalRejectedCount = stats?.rejected ?? 0;

  // Free-tier visibility gate (#170): cap the list at FREE_TIER_VISIBLE_LIKES
  // for non-premium users with more than that many likes. Computed client-side
  // from premium status + total count instead of threading through the
  // paginated query response — usePaginatedQuery doesn't expose page-level
  // metadata.
  const FREE_TIER_VISIBLE_LIKES = 25;
  const visibleLimit = isPremium ? null : FREE_TIER_VISIBLE_LIKES;
  const gatedCount =
    visibleLimit !== null && totalLikedCount > visibleLimit ? totalLikedCount - visibleLimit : 0;
  const cappedLikedItems =
    visibleLimit !== null ? allLikedItems.slice(0, visibleLimit) : allLikedItems;

  // Client-side search over loaded pages. Server-side search doesn't fit
  // pagination cleanly; users typically search names they remember liking
  // recently, which are in the first page anyway.
  const searchLower = submittedSearch.trim().toLowerCase();
  const visibleLikedNames = searchLower
    ? cappedLikedItems.filter((item) => item.name.name.toLowerCase().includes(searchLower))
    : cappedLikedItems;
  const visibleRejectedNames = searchLower
    ? allRejectedItems.filter((item) => item.name.name.toLowerCase().includes(searchLower))
    : allRejectedItems;

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
    try {
      await removeFromLiked({ selectionId: selectedItem.selectionId });
    } catch (error) {
      Sentry.captureException(error);
      Alert.alert('Error', 'Failed to remove name. Please try again.');
    }
    setSelectedItem(null);
  };

  const handleModalRestore = async () => {
    if (!selectedItem) return;
    setDetailModalVisible(false);
    try {
      await restoreToQueue({ selectionId: selectedItem.selectionId });
    } catch (error) {
      Sentry.captureException(error);
      Alert.alert('Error', 'Failed to restore name. Please try again.');
    }
    setSelectedItem(null);
  };

  const handleModalHide = async () => {
    if (!selectedItem) return;
    setDetailModalVisible(false);
    try {
      await hidePermanently({ selectionId: selectedItem.selectionId });
    } catch (error) {
      Sentry.captureException(error);
      Alert.alert('Error', 'Failed to hide name. Please try again.');
    }
    setSelectedItem(null);
  };

  const handleTabChange = useCallback((tab: TabType) => {
    if (bulkLoadingRef.current) return;
    setActiveTab(tab);
  }, []);

  const toggleSelectMode = useCallback(() => {
    if (bulkLoadingRef.current) return;
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

  // Track an in-flight "Select all" request so we can show progress and
  // prevent reentry while pages are still loading.
  const [isSelectingAll, setIsSelectingAll] = useState(false);

  const handleSelectAll = useCallback(async () => {
    const items = activeTab === 'liked' ? visibleLikedNames : visibleRejectedNames;
    const allLoadedIds = items.map((item) => item.selectionId);
    const allSelected = allLoadedIds.length > 0 && allLoadedIds.every((id) => selectedIds.has(id));

    // Toggle off when everything currently loaded is selected.
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }

    // Pagination means "select all" must drain remaining pages so the
    // subsequent bulk delete/hide actually covers every name (#170 +
    // user-reported gap).
    const status = activeTab === 'liked' ? likedStatus : rejectedStatus;
    const loadMore = activeTab === 'liked' ? loadMoreLiked : loadMoreRejected;

    if (status === 'CanLoadMore' || status === 'LoadingMore') {
      setIsSelectingAll(true);
      // The hook re-runs and `status` flips between LoadingMore and
      // CanLoadMore until exhausted. We detect completion with an effect
      // below; here we just kick off the first batch.
      loadMore(LIST_PAGE_SIZE);
      return;
    }

    setSelectedIds(new Set(allLoadedIds));
  }, [
    selectedIds,
    activeTab,
    visibleLikedNames,
    visibleRejectedNames,
    likedStatus,
    rejectedStatus,
    loadMoreLiked,
    loadMoreRejected,
  ]);

  // Drive "select all" through the remaining pages: each time we land in
  // CanLoadMore while the user is selecting-all, fetch the next batch;
  // when Exhausted, materialize the full selection.
  useEffect(() => {
    if (!isSelectingAll) return;
    const status = activeTab === 'liked' ? likedStatus : rejectedStatus;
    if (status === 'CanLoadMore') {
      const loadMore = activeTab === 'liked' ? loadMoreLiked : loadMoreRejected;
      loadMore(LIST_PAGE_SIZE);
      return;
    }
    if (status === 'Exhausted') {
      const items = activeTab === 'liked' ? visibleLikedNames : visibleRejectedNames;
      setSelectedIds(new Set(items.map((item) => item.selectionId)));
      setIsSelectingAll(false);
    }
  }, [
    isSelectingAll,
    activeTab,
    likedStatus,
    rejectedStatus,
    loadMoreLiked,
    loadMoreRejected,
    visibleLikedNames,
    visibleRejectedNames,
  ]);

  const executeBulkAction = useCallback(
    async (
      action: 'delete' | 'hide',
      mutationFn: (args: { selectionIds: Id<'selections'>[] }) => Promise<unknown>,
      ids: Id<'selections'>[],
      errorMessage: string,
    ) => {
      bulkLoadingRef.current = true;
      setBulkAction(action);
      try {
        for (let i = 0; i < ids.length; i += BULK_BATCH_SIZE) {
          const chunk = ids.slice(i, i + BULK_BATCH_SIZE);
          await mutationFn({ selectionIds: chunk });
        }
        setSelectMode(false);
        setSelectedIds(new Set());
      } catch (error) {
        Sentry.captureException(error);
        setSelectedIds(new Set());
        Alert.alert('Error', errorMessage);
      } finally {
        bulkLoadingRef.current = false;
        setBulkAction(null);
      }
    },
    [],
  );

  const handleBulkDelete = useCallback(() => {
    const count = selectedIds.size;
    if (count === 0 || bulkLoadingRef.current) return;

    const action = activeTab === 'liked' ? 'remove' : 'restore to queue';
    Alert.alert(
      `${activeTab === 'liked' ? 'Remove' : 'Restore'} ${count} Names`,
      `Are you sure you want to ${action} ${count} name${count > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: activeTab === 'liked' ? 'Remove' : 'Restore',
          style: activeTab === 'liked' ? 'destructive' : 'default',
          onPress: () =>
            executeBulkAction(
              'delete',
              bulkDelete,
              [...selectedIds] as Id<'selections'>[],
              'Failed to remove some names. Please try again.',
            ),
        },
      ],
    );
  }, [selectedIds, activeTab, bulkDelete, executeBulkAction]);

  const handleBulkHide = useCallback(() => {
    const count = selectedIds.size;
    if (count === 0 || bulkLoadingRef.current) return;

    Alert.alert(
      `Hide ${count} Names`,
      `Are you sure you want to permanently hide ${count} name${count > 1 ? 's' : ''}? They will never appear in your swipe queue again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Hide',
          style: 'destructive',
          onPress: () =>
            executeBulkAction(
              'hide',
              bulkHide,
              [...selectedIds] as Id<'selections'>[],
              'Failed to hide some names. Please try again.',
            ),
        },
      ],
    );
  }, [selectedIds, bulkHide, executeBulkAction]);

  // Data-ready gate: the paginated query has returned its first page.
  const isDataLoaded =
    activeTab === 'liked'
      ? likedStatus !== 'LoadingFirstPage'
      : rejectedStatus !== 'LoadingFirstPage';

  // Emptiness is decided by the actual loaded items, NOT the running
  // counter. The counter is a display optimization for the header and can
  // drift; the paginated query is the source of truth for what exists. This
  // is what makes the empty state appear reliably after a bulk delete (#170).
  const loadedCount = activeTab === 'liked' ? allLikedItems.length : allRejectedItems.length;
  const isDataEmpty = isDataLoaded && loadedCount === 0;

  if (!isDataLoaded) {
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
  if (isDataEmpty) {
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
          {/* Keep the search bar only when the emptiness is a no-results
              state — the user needs it to edit/clear their query. When the
              list is genuinely empty, hide it; there's nothing to search. */}
          {isSearching && (
            <SearchInput
              value={searchInput}
              onChangeText={setSearchInput}
              onSubmit={handleSearchSubmit}
              onClear={handleSearchClear}
            />
          )}
          <View style={styles.emptyContainer}>
            {!isSearching && <BubblePillsBackground />}
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
                  ? "Swipe right on names you love — they'll land right here!"
                  : 'Names you swipe left on will drift over here.'}
            </Text>
            {!isSearching && (
              <Pressable
                style={[styles.createButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/(tabs)/explore')}
              >
                <Text style={styles.createButtonText}>
                  {activeTab === 'liked' ? 'Start Swiping' : 'Start Exploring'}
                </Text>
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
        <Animated.View
          entering={!hasAnimated.current ? FadeInDown.duration(400).springify() : undefined}
        >
          <TabBar activeTab={activeTab} onTabChange={handleTabChange} />
        </Animated.View>
        {activeTab === 'liked' ? (
          <>
            <Animated.View
              entering={
                !hasAnimated.current ? FadeInDown.delay(100).duration(400).springify() : undefined
              }
            >
              <LikedNamesHeader
                count={totalLikedCount}
                sortBy={likedSortBy}
                onSortChange={setLikedSortBy}
                selectMode={selectMode}
                onToggleSelectMode={toggleSelectMode}
                selectedCount={selectedIds.size}
                totalCount={visibleLikedNames.length}
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
            {gracePeriodEndsAt && (
              <View style={[styles.graceBanner, { borderColor: '#F0D060' }]}>
                <Ionicons name="time-outline" size={16} color="#856404" />
                <Text style={styles.graceBannerText}>
                  Premium expires in {formatTimeRemaining(gracePeriodEndsAt)}
                </Text>
              </View>
            )}
            <FlatList
              data={visibleLikedNames}
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
              onEndReached={() => {
                // Don't auto-load past the free-tier cap — gatedCount > 0
                // means we want to show the upgrade banner, not the next
                // page. Otherwise let usePaginatedQuery decide whether
                // there's more (CanLoadMore vs Exhausted).
                if (gatedCount > 0) return;
                if (likedStatus === 'CanLoadMore') {
                  loadMoreLiked(LIST_PAGE_SIZE);
                }
              }}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                gatedCount > 0 ? (
                  <Pressable
                    style={[styles.gatedBanner, { borderColor: colors.border }]}
                    onPress={() => setShowPaywall(true)}
                  >
                    <View style={styles.gatedIconRow}>
                      <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
                      <Text style={[styles.gatedText, { color: colors.textSecondary }]}>
                        +{gatedCount} more name{gatedCount !== 1 ? 's' : ''} — upgrade to view all
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </Pressable>
                ) : likedStatus === 'LoadingMore' ? (
                  <View style={styles.listFooterLoader}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : null
              }
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            />
          </>
        ) : (
          <>
            <Animated.View
              entering={
                !hasAnimated.current ? FadeInDown.delay(100).duration(400).springify() : undefined
              }
            >
              <RejectedNamesHeader
                count={totalRejectedCount}
                sortBy={rejectedSortBy}
                onSortChange={setRejectedSortBy}
                selectMode={selectMode}
                onToggleSelectMode={toggleSelectMode}
                selectedCount={selectedIds.size}
                totalCount={visibleRejectedNames.length}
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
              data={visibleRejectedNames}
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
              onEndReached={() => {
                if (rejectedStatus === 'CanLoadMore') {
                  loadMoreRejected(LIST_PAGE_SIZE);
                }
              }}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                rejectedStatus === 'LoadingMore' ? (
                  <View style={styles.listFooterLoader}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : null
              }
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            />
          </>
        )}

        {/* Floating bulk action bar */}
        {selectMode && (selectedIds.size > 0 || bulkAction) && (
          <Animated.View
            entering={FadeInDown.duration(300).springify()}
            style={styles.bulkActionBar}
          >
            {activeTab === 'liked' ? (
              <Pressable
                style={[styles.bulkActionButton, { backgroundColor: '#FF6B6B' }]}
                onPress={handleBulkDelete}
                disabled={!!bulkAction}
              >
                {bulkAction === 'delete' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="trash-outline" size={20} color="#fff" />
                )}
                <Text style={styles.bulkActionText}>
                  {bulkAction === 'delete' ? 'Removing...' : `Remove ${selectedIds.size}`}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.bulkActionRow}>
                <Pressable
                  style={[styles.bulkActionButton, { backgroundColor: colors.primary, flex: 1 }]}
                  onPress={handleBulkDelete}
                  disabled={!!bulkAction}
                >
                  {bulkAction === 'delete' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="refresh-outline" size={20} color="#fff" />
                  )}
                  <Text style={styles.bulkActionText}>
                    {bulkAction === 'delete' ? 'Restoring...' : `Restore ${selectedIds.size}`}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.bulkActionButton, { backgroundColor: '#FF6B6B', flex: 1 }]}
                  onPress={handleBulkHide}
                  disabled={!!bulkAction}
                >
                  {bulkAction === 'hide' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="eye-off-outline" size={20} color="#fff" />
                  )}
                  <Text style={styles.bulkActionText}>
                    {bulkAction === 'hide' ? 'Hiding...' : `Hide ${selectedIds.size}`}
                  </Text>
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

        <Paywall
          visible={showPaywall}
          onClose={() => setShowPaywall(false)}
          trigger="dashboard_limit"
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
    justifyContent: 'flex-start',
    paddingHorizontal: 32,
    paddingTop: 60,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#2D1B4E',
    textAlign: 'center',
    zIndex: 10,
  },
  emptyDescription: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    textAlign: 'center',
    lineHeight: 24,
    zIndex: 10,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
    zIndex: 10,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  listContent: {
    paddingBottom: 100,
  },
  listFooterLoader: {
    paddingVertical: 24,
    alignItems: 'center',
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
  graceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#FFF3CD',
    borderRadius: 10,
    borderWidth: 1,
  },
  graceBannerText: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    fontWeight: '500',
    color: '#856404',
  },
  gatedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFF8FA',
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  gatedIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gatedText: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    fontWeight: '500',
  },
});
