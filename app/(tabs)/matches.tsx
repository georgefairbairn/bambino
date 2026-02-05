import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Pressable,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from 'convex/react';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/convex/_generated/api';
import { useActiveSearch } from '@/hooks/use-active-search';
import { Fonts } from '@/constants/theme';
import { MatchCard, MatchDetailModal } from '@/components/matches';
import { JoinSearchModal } from '@/components/search/join-search-modal';
import { Doc, Id } from '@/convex/_generated/dataModel';
import * as Haptics from 'expo-haptics';

type SortOption = 'newest' | 'oldest' | 'name_asc' | 'name_desc' | 'rank';

type MatchWithName = {
  _id: Id<'matches'>;
  searchId: Id<'searches'>;
  nameId: Id<'names'>;
  user1Id: Id<'users'>;
  user2Id: Id<'users'>;
  isFavorite?: boolean;
  notes?: string;
  rank?: number;
  isChosen?: boolean;
  matchedAt: number;
  createdAt: number;
  updatedAt: number;
  name: Doc<'names'>;
};

const SORT_OPTIONS: { value: SortOption; label: string; icon: string }[] = [
  { value: 'newest', label: 'Newest', icon: 'time-outline' },
  { value: 'oldest', label: 'Oldest', icon: 'time' },
  { value: 'name_asc', label: 'A-Z', icon: 'arrow-up' },
  { value: 'name_desc', label: 'Z-A', icon: 'arrow-down' },
  { value: 'rank', label: 'Rank', icon: 'trophy-outline' },
];

export default function Matches() {
  const { activeSearchId, isLoading: isSearchLoading, setActiveSearch } = useActiveSearch();
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [selectedMatch, setSelectedMatch] = useState<MatchWithName | null>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const matches = useQuery(
    api.matches.getMatches,
    activeSearchId ? { searchId: activeSearchId, sortBy } : 'skip',
  );

  const chosenName = useQuery(
    api.matches.getChosenName,
    activeSearchId ? { searchId: activeSearchId } : 'skip',
  );

  const updateMatch = useMutation(api.matches.updateMatch);

  const handleToggleFavorite = useCallback(
    async (matchId: Id<'matches'>, currentValue?: boolean) => {
      try {
        await updateMatch({
          matchId,
          isFavorite: !currentValue,
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        console.error('Failed to toggle favorite:', error);
      }
    },
    [updateMatch],
  );

  const handleChoose = useCallback(
    async (match: MatchWithName) => {
      Alert.alert(
        'Choose This Name?',
        `Are you sure you want to choose "${match.name.name}" as your final selection?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Choose',
            onPress: async () => {
              try {
                await updateMatch({
                  matchId: match._id,
                  isChosen: true,
                });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch (error) {
                console.error('Failed to choose name:', error);
                Alert.alert('Error', 'Failed to choose name. Please try again.');
              }
            },
          },
        ],
      );
    },
    [updateMatch],
  );

  const handleShare = useCallback(async () => {
    if (!matches || matches.length === 0) return;

    const favoriteMatches = matches.filter((m) => m.isFavorite);
    const listToShare = favoriteMatches.length > 0 ? favoriteMatches : matches;

    const names = listToShare.map((m, i) => {
      const prefix = m.isChosen ? '* ' : m.rank ? `${m.rank}. ` : `${i + 1}. `;
      return `${prefix}${m.name.name}`;
    });

    const message = chosenName
      ? `We've chosen the name: ${chosenName.name?.name}!\n\nOur other matches:\n${names.join('\n')}`
      : `Our baby name matches:\n${names.join('\n')}`;

    try {
      await Share.share({
        message,
        title: 'Our Baby Name Matches',
      });
    } catch (error) {
      console.error('Failed to share:', error);
    }
  }, [matches, chosenName]);

  const renderItem = useCallback(
    ({ item }: { item: MatchWithName }) => (
      <MatchCard
        match={item}
        onPress={() => setSelectedMatch(item)}
        onToggleFavorite={() => handleToggleFavorite(item._id, item.isFavorite)}
        onChoose={!item.isChosen ? () => handleChoose(item) : undefined}
      />
    ),
    [handleToggleFavorite, handleChoose],
  );

  const keyExtractor = useCallback((item: MatchWithName) => item._id, []);

  const handleJoinSuccess = useCallback(
    async (searchId: string) => {
      await setActiveSearch(searchId as Id<'searches'>);
    },
    [setActiveSearch],
  );

  // Loading state (only while checking search context)
  if (isSearchLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0a7ea4" />
        </View>
      </SafeAreaView>
    );
  }

  // No search selected
  if (!activeSearchId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="people-outline" size={64} color="#9ca3af" />
          </View>
          <Text style={styles.emptyTitle}>No Matches Yet</Text>
          <Text style={styles.emptyDescription}>
            Join your partner&apos;s search using their share code. When you both like the same
            name, it will appear here!
          </Text>
          <Pressable style={styles.joinButton} onPress={() => setShowJoinModal(true)}>
            <Ionicons name="enter-outline" size={20} color="#fff" />
            <Text style={styles.joinButtonText}>Join a Search</Text>
          </Pressable>
        </View>
        <JoinSearchModal
          visible={showJoinModal}
          onClose={() => setShowJoinModal(false)}
          onSuccess={handleJoinSuccess}
        />
      </SafeAreaView>
    );
  }

  // Data loading state
  if (matches === undefined) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0a7ea4" />
        </View>
      </SafeAreaView>
    );
  }

  // Empty matches state
  if (matches.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="people-outline" size={64} color="#9ca3af" />
          </View>
          <Text style={styles.emptyTitle}>No Matches Yet</Text>
          <Text style={styles.emptyDescription}>
            Join your partner&apos;s search using their share code. When you both like the same
            name, it will appear here!
          </Text>
          <Pressable style={styles.joinButton} onPress={() => setShowJoinModal(true)}>
            <Ionicons name="enter-outline" size={20} color="#fff" />
            <Text style={styles.joinButtonText}>Join a Search</Text>
          </Pressable>
        </View>
        <JoinSearchModal
          visible={showJoinModal}
          onClose={() => setShowJoinModal(false)}
          onSuccess={handleJoinSuccess}
        />
      </SafeAreaView>
    );
  }

  const favoriteCount = matches.filter((m) => m.isFavorite).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Matches</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{matches.length}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Pressable style={styles.headerButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color="#0a7ea4" />
          </Pressable>
        </View>
      </View>

      {/* Chosen name banner */}
      {chosenName && chosenName.name && (
        <View style={styles.chosenBanner}>
          <Ionicons name="trophy" size={20} color="#f59e0b" />
          <Text style={styles.chosenBannerText}>
            Chosen: <Text style={styles.chosenName}>{chosenName.name.name}</Text>
          </Text>
        </View>
      )}

      {/* Sort/filter bar */}
      <View style={styles.filterBar}>
        <Pressable style={styles.sortButton} onPress={() => setShowSortMenu(!showSortMenu)}>
          <Ionicons name="swap-vertical-outline" size={18} color="#6b7280" />
          <Text style={styles.sortButtonText}>
            {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
          </Text>
          <Ionicons name={showSortMenu ? 'chevron-up' : 'chevron-down'} size={16} color="#6b7280" />
        </Pressable>

        {favoriteCount > 0 && (
          <View style={styles.favoriteIndicator}>
            <Ionicons name="star" size={14} color="#f59e0b" />
            <Text style={styles.favoriteCount}>
              {favoriteCount} favorite{favoriteCount !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      {/* Sort menu dropdown */}
      {showSortMenu && (
        <View style={styles.sortMenu}>
          {SORT_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={[styles.sortOption, sortBy === option.value && styles.sortOptionActive]}
              onPress={() => {
                setSortBy(option.value);
                setShowSortMenu(false);
              }}
            >
              <Ionicons
                name={option.icon as keyof typeof Ionicons.glyphMap}
                size={18}
                color={sortBy === option.value ? '#0a7ea4' : '#6b7280'}
              />
              <Text
                style={[
                  styles.sortOptionText,
                  sortBy === option.value && styles.sortOptionTextActive,
                ]}
              >
                {option.label}
              </Text>
              {sortBy === option.value && <Ionicons name="checkmark" size={18} color="#0a7ea4" />}
            </Pressable>
          ))}
        </View>
      )}

      {/* Match list */}
      <FlatList
        data={matches as MatchWithName[]}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Match detail modal */}
      <MatchDetailModal
        visible={selectedMatch !== null}
        match={selectedMatch}
        onClose={() => setSelectedMatch(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#C6E7F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#1a1a1a',
  },
  countBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#fff',
  },
  headerButton: {
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
  },
  chosenBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fffbeb',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  chosenBannerText: {
    fontSize: 15,
    fontFamily: Fonts?.sans,
    color: '#92400e',
  },
  chosenName: {
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#78350f',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  sortButtonText: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#6b7280',
  },
  favoriteIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  favoriteCount: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: '#f59e0b',
  },
  sortMenu: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  sortOptionActive: {
    backgroundColor: '#e0f2fe',
  },
  sortOptionText: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts?.sans,
    color: '#374151',
  },
  sortOptionTextActive: {
    color: '#0a7ea4',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontFamily: Fonts?.sans,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a7ea4',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  joinButtonText: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#fff',
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 20,
  },
});
