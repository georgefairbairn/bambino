import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Alert } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useQuery, useMutation } from 'convex/react';
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
import { LoadingScreen, useGracefulLoading } from '@/components/ui/loading-screen';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
import { Doc, Id } from '@/convex/_generated/dataModel';

type TabType = 'liked' | 'rejected';

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
  const { gracePeriodEndsAt } = useEffectivePremium();

  const [activeTab, setActiveTab] = useState<TabType>('liked');
  const [showPaywall, setShowPaywall] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [likedSortBy, setLikedSortBy] = useState<SortOption>('liked_newest');
  const [rejectedSortBy, setRejectedSortBy] = useState<RejectedSortOption>('rejected_newest');

  // Multi-select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const likedNamesResult = useQuery(api.selections.getLikedNames, {
    search: submittedSearch || undefined,
    sortBy: likedSortBy,
  });
  const allLikedNames = likedNamesResult?.names ?? [];
  const visibleLimit = likedNamesResult?.visibleLimit;
  const visibleLikedNames =
    visibleLimit != null ? allLikedNames.slice(0, visibleLimit) : allLikedNames;
  const gatedCount = visibleLimit != null ? Math.max(0, allLikedNames.length - visibleLimit) : 0;

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
    const data = activeTab === 'liked' ? visibleLikedNames : rejectedNames;
    if (!data) return;
    const allIds = data.map((item) => item.selectionId);
    const allSelected = allIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  }, [selectedIds, activeTab, visibleLikedNames, rejectedNames]);

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
            try {
              await bulkDelete({
                selectionIds: [...selectedIds] as Id<'selections'>[],
              });
              setSelectMode(false);
              setSelectedIds(new Set());
            } catch (error) {
              Sentry.captureException(error);
              Alert.alert('Error', 'Failed to remove names. Please try again.');
            }
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
            try {
              await bulkHide({
                selectionIds: [...selectedIds] as Id<'selections'>[],
              });
              setSelectMode(false);
              setSelectedIds(new Set());
            } catch (error) {
              Sentry.captureException(error);
              Alert.alert('Error', 'Failed to hide names. Please try again.');
            }
          },
        },
      ],
    );
  }, [selectedIds, bulkHide]);

  const isDataLoaded =
    activeTab === 'liked' ? likedNamesResult !== undefined : rejectedNames !== undefined;
  const isDataEmpty =
    activeTab === 'liked' ? allLikedNames.length === 0 : (rejectedNames?.length ?? 0) === 0;

  const { showLoading, loadingProps } = useGracefulLoading(isDataLoaded);

  if (showLoading) {
    return <LoadingScreen {...loadingProps} />;
  }

  // Data loading state
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
          <SearchInput
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmit={handleSearchSubmit}
            onClear={handleSearchClear}
          />
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
          <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
        </Animated.View>
        {activeTab === 'liked' ? (
          <>
            <Animated.View
              entering={
                !hasAnimated.current ? FadeInDown.delay(100).duration(400).springify() : undefined
              }
            >
              <LikedNamesHeader
                count={allLikedNames.length}
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
