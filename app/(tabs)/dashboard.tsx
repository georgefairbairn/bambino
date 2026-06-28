import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { SearchResultCard } from '@/components/dashboard/search-result-card';
import { NameDetailModal } from '@/components/name-detail/name-detail-modal';
import { Paywall } from '@/components/paywall';
import { useEffectivePremium } from '@/hooks/use-effective-premium';
import { BUTTON_TEXT, Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { trackScreen } from '@/lib/analytics';
import { decodeConvexError } from '@/lib/convex-errors';
import { GradientBackground } from '@/components/ui/gradient-background';
import { BubblePillsBackground } from '@/components/ui/bubble-pills-background';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
import { Doc, Id } from '@/convex/_generated/dataModel';

type TabType = 'liked' | 'rejected';
type SelectionType = 'like' | 'reject' | 'skip' | 'hidden';

// Search placeholder doubles as the manual-add hint (#292): the box filters
// your swiped list AND surfaces names from the DB you can add.
const SEARCH_PLACEHOLDER = 'Search your list, or find a name to add…';
// Debounce before a keystroke drives the Convex search query — keeps us from
// re-subscribing on every character while staying responsive.
const SEARCH_DEBOUNCE_MS = 200;
// Cap on DB suggestions surfaced per search (paging deferred, #292).
const SEARCH_RESULT_LIMIT = 30;

// Local optimistic record for a search row the user just tapped. selectionType
// null means "removed"; selectionId is captured from recordSelection's return
// so the row can be removed again without waiting for the reactive query.
type OptimisticState = {
  selectionType: SelectionType | null;
  selectionId: Id<'selections'> | null;
};

/**
 * Decode a Convex selection-mutation failure into a specific alert. A
 * SELECTION_NOT_FOUND means the row was already gone — the dashboard's reactive
 * queries self-heal, so it's a silent no-op rather than an error. Everything
 * else is reported and shows the decoded message instead of a generic alert.
 */
function alertSelectionMutationError(error: unknown, fallback: string) {
  const { code, message } = decodeConvexError(error, fallback);
  if (code === 'SELECTION_NOT_FOUND') return;
  Sentry.captureException(error);
  Alert.alert("Couldn't update that", message);
}

// Hint shown when a search hit is in the *other* sub-tab, so the user knows a
// tap will move it across lists rather than add it fresh. Hidden names are
// filtered out of search entirely (#292), so they never reach this.
function otherTabLabelFor(type: SelectionType): string | null {
  switch (type) {
    case 'like':
      return 'In Liked';
    case 'reject':
      return 'In Rejected';
    default:
      return null;
  }
}

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
  // searchInput is the live text field; searchQuery is the debounced value that
  // actually drives the Convex search (#292, was submit-gated pre-#292).
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [likedSortBy, setLikedSortBy] = useState<SortOption>('liked_newest');
  const [rejectedSortBy, setRejectedSortBy] = useState<RejectedSortOption>('rejected_newest');

  // Optimistic add/remove state for search rows, keyed by nameId.
  const [optimistic, setOptimistic] = useState<Record<string, OptimisticState>>({});

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

  // Modal state. context drives which actions the detail sheet shows:
  // 'liked'/'rejected' come from a list card (with a selectionId for the
  // action buttons); 'detail' is opened from a search result and is
  // info-only (no selectionId, no action buttons).
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    name: Doc<'names'>;
    selectionId?: Id<'selections'>;
    context: 'liked' | 'rejected' | 'detail';
  } | null>(null);

  const resetSearchAndSelection = useCallback(() => {
    setSearchInput('');
    setSearchQuery('');
    setOptimistic({});
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  // Reset search and select mode when switching liked/rejected tabs
  useEffect(() => {
    resetSearchAndSelection();
  }, [activeTab, resetSearchAndSelection]);

  // Clear search when returning to this tab from another tab
  useFocusEffect(
    useCallback(() => {
      trackScreen('Dashboard');
      resetSearchAndSelection();
    }, [resetSearchAndSelection]),
  );

  // Debounce the live input into the query that drives Convex search.
  useEffect(() => {
    const handle = setTimeout(() => setSearchQuery(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const handleSearchSubmit = () => {
    // Return key flushes the debounce so results appear immediately.
    setSearchQuery(searchInput);
  };

  const handleSearchClear = () => {
    setSearchQuery('');
    setOptimistic({});
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
  // for non-premium users with more than that many likes.
  const FREE_TIER_VISIBLE_LIKES = 25;
  const visibleLimit = isPremium ? null : FREE_TIER_VISIBLE_LIKES;
  const gatedCount =
    visibleLimit !== null && totalLikedCount > visibleLimit ? totalLikedCount - visibleLimit : 0;
  const likedListData =
    visibleLimit !== null ? allLikedItems.slice(0, visibleLimit) : allLikedItems;
  const rejectedListData = allRejectedItems;

  // ---- Search-to-add (#292) ------------------------------------------------
  const trimmedQuery = searchQuery.trim();
  const firstChar = trimmedQuery[0] ?? '';
  // searchNames needs an indexed filter; we anchor on the first letter (names
  // are letter-initial). Non-letter first chars can't match a firstLetter
  // bucket, so don't fire.
  const searchActive = trimmedQuery.length >= 1 && /[a-zA-Z]/.test(firstChar);

  const searchResults = useQuery(
    api.names.searchNames,
    searchActive
      ? { search: trimmedQuery, firstLetter: firstChar, limit: SEARCH_RESULT_LIMIT }
      : 'skip',
  );

  // Alphabetical for predictable "type Soph → Sophia, Sophie…" ordering.
  const sortedResults = useMemo(
    () =>
      searchResults ? [...searchResults].sort((a, b) => a.name.localeCompare(b.name)) : undefined,
    [searchResults],
  );

  const resultIds = useMemo(() => sortedResults?.map((n) => n._id) ?? [], [sortedResults]);

  const serverStates = useQuery(
    api.selections.getSelectionStatesForNames,
    searchActive && resultIds.length > 0 ? { nameIds: resultIds } : 'skip',
  );

  const serverStateMap = useMemo(() => {
    const map = new Map<string, { selectionType: SelectionType; selectionId: Id<'selections'> }>();
    serverStates?.forEach((s) =>
      map.set(s.nameId, { selectionType: s.selectionType, selectionId: s.selectionId }),
    );
    return map;
  }, [serverStates]);

  // Instant fallback from the already-loaded liked/rejected pages, so a name
  // the user recently swiped shows the right icon the moment results render —
  // before the getSelectionStatesForNames round-trip resolves. serverStateMap
  // still covers names beyond the first loaded page.
  const localStateMap = useMemo(() => {
    const map = new Map<string, { selectionType: SelectionType; selectionId: Id<'selections'> }>();
    allLikedItems.forEach((it) =>
      map.set(it.name._id, { selectionType: 'like', selectionId: it.selectionId }),
    );
    allRejectedItems.forEach((it) =>
      map.set(it.name._id, { selectionType: 'reject', selectionId: it.selectionId }),
    );
    return map;
  }, [allLikedItems, allRejectedItems]);

  const removeFromLiked = useMutation(api.selections.removeFromLiked);
  const restoreToQueue = useMutation(api.selections.restoreToQueue);
  const hidePermanently = useMutation(api.selections.hidePermanently);
  const recordSelection = useMutation(api.selections.recordSelection);
  const bulkDelete = useMutation(api.selections.bulkDeleteSelections);
  const bulkHide = useMutation(api.selections.bulkHideSelections);

  // Effective selection state for a search row: optimistic override (if the
  // user just tapped it) wins, then the scoped server query, then the instant
  // local-page fallback. All three carry a selectionId so the remove path
  // never needs a second lookup.
  const effectiveStateFor = useCallback(
    (nameId: Id<'names'>): OptimisticState => {
      const opt = optimistic[nameId];
      if (opt) return opt;
      const known = serverStateMap.get(nameId) ?? localStateMap.get(nameId);
      return known
        ? { selectionType: known.selectionType, selectionId: known.selectionId }
        : { selectionType: null, selectionId: null };
    },
    [optimistic, serverStateMap, localStateMap],
  );

  // Tapping the ＋ on a search row adds it (or moves it from the other list).
  // recordSelection is the same mutation swiping uses, so partner
  // match-detection comes free.
  const handleAddSearchResult = useCallback(
    async (name: Doc<'names'>) => {
      const nameId = name._id;
      const tabType: 'like' | 'reject' = activeTab === 'liked' ? 'like' : 'reject';
      setOptimistic((prev) => ({
        ...prev,
        [nameId]: { selectionType: tabType, selectionId: null },
      }));
      try {
        const result = await recordSelection({ nameId, selectionType: tabType });
        if (result && 'error' in result) {
          // Free-tier swipe cap — revert and surface the paywall.
          setOptimistic((prev) => {
            const next = { ...prev };
            delete next[nameId];
            return next;
          });
          setShowPaywall(true);
          return;
        }
        setOptimistic((prev) => ({
          ...prev,
          [nameId]: { selectionType: tabType, selectionId: result.selectionId },
        }));
      } catch (error) {
        setOptimistic((prev) => {
          const next = { ...prev };
          delete next[nameId];
          return next;
        });
        Sentry.captureException(error);
        Alert.alert("Couldn't add that", 'Please try again.');
      }
    },
    [activeTab, recordSelection],
  );

  // Shared confirm-then-mutate for the manage actions on an already-in-list
  // search row (mirrors the liked/rejected list cards). optimisticType is the
  // selection's state after the action: null = deleted, 'hidden' = hidden.
  const runSearchRowAction = useCallback(
    (
      name: Doc<'names'>,
      opts: {
        title: string;
        message: string;
        confirmText: string;
        destructive?: boolean;
        optimisticType: SelectionType | null;
        run: (selectionId: Id<'selections'>) => Promise<unknown>;
        errorMessage: string;
      },
    ) => {
      const nameId = name._id;
      const selectionId = effectiveStateFor(nameId).selectionId;
      // Add hasn't resolved yet (no id) — nothing to act on.
      if (!selectionId) return;
      Alert.alert(opts.title, opts.message, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: opts.confirmText,
          style: opts.destructive ? 'destructive' : 'default',
          onPress: async () => {
            setOptimistic((prev) => ({
              ...prev,
              [nameId]: {
                selectionType: opts.optimisticType,
                selectionId: opts.optimisticType ? selectionId : null,
              },
            }));
            try {
              await opts.run(selectionId);
            } catch (error) {
              setOptimistic((prev) => {
                const next = { ...prev };
                delete next[nameId];
                return next;
              });
              alertSelectionMutationError(error, opts.errorMessage);
            }
          },
        },
      ]);
    },
    [effectiveStateFor],
  );

  // 🗑 on a liked search row → remove (mirrors LikedNameCard).
  const handleRemoveSearchResult = (name: Doc<'names'>) =>
    runSearchRowAction(name, {
      title: 'Remove from Liked',
      message: `Remove "${name.name}" from your liked names? It will reappear in your swipe queue.`,
      confirmText: 'Remove',
      destructive: true,
      optimisticType: null,
      run: (selectionId) => removeFromLiked({ selectionId }),
      errorMessage: 'Could not remove this name.',
    });

  // Restore on a rejected search row → back to the swipe queue (mirrors RejectedNameCard).
  const handleRestoreSearchResult = (name: Doc<'names'>) =>
    runSearchRowAction(name, {
      title: 'Restore to Queue',
      message: `Restore "${name.name}" to your swipe queue? You'll be able to reconsider this name.`,
      confirmText: 'Restore',
      optimisticType: null,
      run: (selectionId) => restoreToQueue({ selectionId }),
      errorMessage: 'Could not restore this name.',
    });

  // Hide on a rejected search row → permanently hidden (mirrors RejectedNameCard).
  const handleHideSearchResult = (name: Doc<'names'>) =>
    runSearchRowAction(name, {
      title: 'Hide Permanently',
      message: `Hide "${name.name}" permanently? It will never appear in your swipe queue again.`,
      confirmText: 'Hide',
      destructive: true,
      optimisticType: 'hidden',
      run: (selectionId) => hidePermanently({ selectionId }),
      errorMessage: 'Could not hide this name.',
    });

  // Tapping the body of a search row opens the read-only detail sheet.
  const handleSearchResultPress = (name: Doc<'names'>) => {
    setSelectedItem({ name, context: 'detail' });
    setDetailModalVisible(true);
  };

  const handleCardPress = (name: Doc<'names'>, selectionId: Id<'selections'>) => {
    setSelectedItem({ name, selectionId, context: activeTab });
    setDetailModalVisible(true);
  };

  const handleModalRemove = async () => {
    if (!selectedItem?.selectionId) return;
    setDetailModalVisible(false);
    try {
      await removeFromLiked({ selectionId: selectedItem.selectionId });
    } catch (error) {
      alertSelectionMutationError(error, 'Could not remove this name.');
    }
    setSelectedItem(null);
  };

  const handleModalRestore = async () => {
    if (!selectedItem?.selectionId) return;
    setDetailModalVisible(false);
    try {
      await restoreToQueue({ selectionId: selectedItem.selectionId });
    } catch (error) {
      alertSelectionMutationError(error, 'Could not restore this name.');
    }
    setSelectedItem(null);
  };

  const handleModalHide = async () => {
    if (!selectedItem?.selectionId) return;
    setDetailModalVisible(false);
    try {
      await hidePermanently({ selectionId: selectedItem.selectionId });
    } catch (error) {
      alertSelectionMutationError(error, 'Could not hide this name.');
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

  // Searching and select mode are mutually exclusive — drop out of select mode
  // when a search starts so the (hidden) bulk bar can't act on a stale set.
  useEffect(() => {
    if (searchActive && selectMode) {
      setSelectMode(false);
      setSelectedIds(new Set());
    }
  }, [searchActive, selectMode]);

  // Track an in-flight "Select all" request so we can show progress and
  // prevent reentry while pages are still loading.
  const [isSelectingAll, setIsSelectingAll] = useState(false);

  const handleSelectAll = useCallback(async () => {
    const items = activeTab === 'liked' ? likedListData : rejectedListData;
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
    likedListData,
    rejectedListData,
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
      const items = activeTab === 'liked' ? likedListData : rejectedListData;
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
    likedListData,
    rejectedListData,
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
        const { message } = decodeConvexError(error, errorMessage);
        Alert.alert("Couldn't update those", message);
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

  const showSearchInput = !selectMode;
  const currentTabSelectionType: 'like' | 'reject' = activeTab === 'liked' ? 'like' : 'reject';

  const renderHeader = () => (
    <>
      <Animated.View
        entering={!hasAnimated.current ? FadeInDown.duration(400).springify() : undefined}
      >
        <TabBar activeTab={activeTab} onTabChange={handleTabChange} />
      </Animated.View>
      <Animated.View
        entering={
          !hasAnimated.current ? FadeInDown.delay(100).duration(400).springify() : undefined
        }
      >
        {activeTab === 'liked' ? (
          <LikedNamesHeader
            count={totalLikedCount}
            sortBy={likedSortBy}
            onSortChange={setLikedSortBy}
            selectMode={selectMode}
            onToggleSelectMode={toggleSelectMode}
            selectedCount={selectedIds.size}
            totalCount={likedListData.length}
            onSelectAll={handleSelectAll}
            hideActions={searchActive}
          />
        ) : (
          <RejectedNamesHeader
            count={totalRejectedCount}
            sortBy={rejectedSortBy}
            onSortChange={setRejectedSortBy}
            selectMode={selectMode}
            onToggleSelectMode={toggleSelectMode}
            selectedCount={selectedIds.size}
            totalCount={rejectedListData.length}
            onSelectAll={handleSelectAll}
            hideActions={searchActive}
          />
        )}
        {showSearchInput && (
          <SearchInput
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmit={handleSearchSubmit}
            onClear={handleSearchClear}
            placeholder={SEARCH_PLACEHOLDER}
          />
        )}
      </Animated.View>
    </>
  );

  // ---- Body renderers ------------------------------------------------------

  const renderSearchBody = () => {
    if (sortedResults === undefined) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    }
    // Hidden names are excluded from search (#292): hiding is permanent, so a
    // hidden name disappears on confirm and won't resurface on a later search.
    const visibleResults = sortedResults.filter(
      (n) => effectiveStateFor(n._id).selectionType !== 'hidden',
    );
    if (visibleResults.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Names Found</Text>
          <Text style={styles.emptyDescription}>
            No names match “{trimmedQuery}”. Try a different spelling.
          </Text>
        </View>
      );
    }
    return (
      <FlatList
        data={visibleResults}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => {
          const state = effectiveStateFor(item._id);
          const inThisTab = state.selectionType === currentTabSelectionType;
          const otherTabLabel =
            !inThisTab && state.selectionType ? otherTabLabelFor(state.selectionType) : null;
          return (
            <SearchResultCard
              name={item}
              tab={activeTab}
              inThisTab={inThisTab}
              otherTabLabel={otherTabLabel}
              onPress={() => handleSearchResultPress(item)}
              onAdd={() => handleAddSearchResult(item)}
              onRemove={() => handleRemoveSearchResult(item)}
              onRestore={() => handleRestoreSearchResult(item)}
              onHide={() => handleHideSearchResult(item)}
            />
          );
        }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
    );
  };

  const renderEmptyBody = () => (
    <View style={styles.emptyContainer}>
      <BubblePillsBackground />
      <Text style={styles.emptyTitle}>
        {activeTab === 'liked' ? 'No Liked Names Yet' : 'No Rejected Names'}
      </Text>
      <Text style={styles.emptyDescription}>
        {activeTab === 'liked'
          ? "Swipe right on names you love and they'll land right here!"
          : 'Names you swipe left on will appear here.'}
      </Text>
      <Pressable
        style={[styles.createButton, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/(tabs)/explore')}
      >
        <Text style={styles.createButtonText}>
          {activeTab === 'liked' ? 'Start Swiping' : 'Start Exploring'}
        </Text>
      </Pressable>
    </View>
  );

  const renderLikedList = () => (
    <>
      {gracePeriodEndsAt && (
        <View style={[styles.graceBanner, { borderColor: '#F0D060' }]}>
          <Ionicons name="time-outline" size={16} color="#856404" />
          <Text style={styles.graceBannerText}>
            Premium expires in {formatTimeRemaining(gracePeriodEndsAt)}
          </Text>
        </View>
      )}
      <FlatList
        data={likedListData}
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
              style={[styles.gatedBanner, { borderColor: colors.primary }]}
              onPress={() => setShowPaywall(true)}
            >
              <View style={styles.gatedIconRow}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
                <Text style={[styles.gatedText, { color: colors.primary }]}>
                  +{gatedCount} more name{gatedCount !== 1 ? 's' : ''}. Upgrade to view all
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
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
  );

  const renderRejectedList = () => (
    <FlatList
      data={rejectedListData}
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
  );

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
          <View style={styles.loadingContainer}>
            <LoadingIndicator size="small" />
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.flexContainer} edges={['top']}>
        {renderHeader()}

        {searchActive
          ? renderSearchBody()
          : isDataEmpty
            ? renderEmptyBody()
            : activeTab === 'liked'
              ? renderLikedList()
              : renderRejectedList()}

        {/* Floating bulk action bar */}
        {!searchActive && selectMode && (selectedIds.size > 0 || bulkAction) && (
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

        {/* Name detail modal. A list card opens it with its tab context +
            actions; a search row opens it in read-only 'detail' context. */}
        <NameDetailModal
          visible={detailModalVisible}
          name={selectedItem?.name ?? null}
          context={selectedItem?.context ?? 'liked'}
          onClose={() => {
            setDetailModalVisible(false);
            setSelectedItem(null);
          }}
          onRemove={selectedItem?.context === 'liked' ? handleModalRemove : undefined}
          onRestore={selectedItem?.context === 'rejected' ? handleModalRestore : undefined}
          onHide={selectedItem?.context === 'rejected' ? handleModalHide : undefined}
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
        <Text style={[styles.tabText, activeTab === 'liked' && { color: colors.primary }]}>
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
        <Text style={[styles.tabText, activeTab === 'rejected' && { color: colors.primary }]}>
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
    ...BUTTON_TEXT.pill,
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
    ...BUTTON_TEXT.cta,
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
    ...BUTTON_TEXT.cta,
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
