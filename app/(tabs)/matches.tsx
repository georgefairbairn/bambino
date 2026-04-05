import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useQuery, useMutation } from 'convex/react';
import { Ionicons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';
import { useRouter } from 'expo-router';
import { api } from '@/convex/_generated/api';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { usePurchases } from '@/hooks/use-purchases';
import { Paywall } from '@/components/paywall';
import { MatchCard, MatchDetailModal } from '@/components/matches';
import { GradientBackground } from '@/components/ui/gradient-background';
import { BubblePillsBackground } from '@/components/ui/bubble-pills-background';
import { MatchAnimation } from '@/components/ui/match-animation';
import { LoadingScreen, useGracefulLoading } from '@/components/ui/loading-screen';
import { Doc, Id } from '@/convex/_generated/dataModel';
import * as Haptics from 'expo-haptics';

type SortOption = 'newest' | 'oldest' | 'name_asc' | 'name_desc' | 'rank';

type MatchWithName = {
  _id: Id<'matches'>;
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
  const { colors } = useTheme();
  const { isPremium, restorePurchases } = usePurchases();
  const router = useRouter();
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [selectedMatch, setSelectedMatch] = useState<MatchWithName | null>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const partnerInfo = useQuery(api.partners.getPartnerInfo);
  const hasPartner = partnerInfo?.partner !== null && partnerInfo?.partner !== undefined;

  const matches = useQuery(api.matches.getMatches, { sortBy });
  const chosenName = useQuery(api.matches.getChosenName);
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
        Sentry.captureException(error);
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
                Sentry.captureException(error);
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
      Sentry.captureException(error);
    }
  }, [matches, chosenName]);

  const renderItem = useCallback(
    ({ item, index }: { item: MatchWithName; index: number }) => (
      <Animated.View
        entering={FadeInUp.delay(index * 50)
          .duration(400)
          .springify()}
      >
        <MatchCard
          match={item}
          onPress={() => setSelectedMatch(item)}
          onToggleFavorite={() => handleToggleFavorite(item._id, item.isFavorite)}
          onChoose={!item.isChosen ? () => handleChoose(item) : undefined}
        />
      </Animated.View>
    ),
    [handleToggleFavorite, handleChoose],
  );

  const keyExtractor = useCallback((item: MatchWithName) => item._id, []);

  const { showLoading, loadingProps } = useGracefulLoading(matches !== undefined);

  if (showLoading) {
    return <LoadingScreen {...loadingProps} />;
  }

  // Three empty states based on user status
  if (!isPremium || !hasPartner || !matches || matches.length === 0) {
    const isFreeUser = !isPremium;
    const isPremiumNoPartner = isPremium && !hasPartner;

    return (
      <GradientBackground>
        <SafeAreaView style={styles.flexContainer} edges={['top']}>
          <View style={styles.emptyContainer}>
            <BubblePillsBackground />

            {/* Title */}
            <Text style={styles.emptyTitle}>
              {isFreeUser
                ? 'Match With Your Partner'
                : isPremiumNoPartner
                  ? 'Invite Your Partner'
                  : 'No Matches Yet'}
            </Text>

            {/* Description */}
            <Text style={styles.emptyDescription}>
              {isFreeUser
                ? 'Upgrade to connect with your partner and discover the baby names you both love.'
                : isPremiumNoPartner
                  ? 'Share your partner code and start discovering the names you both love. Matches appear when you both swipe right!'
                  : "When you and your partner both love the same name — it's a match! Keep swiping to find your favourites."}
            </Text>

            {/* Animation */}
            <MatchAnimation />

            {/* CTAs */}
            {isFreeUser && (
              <View style={styles.ctaContainer}>
                <Pressable
                  style={[styles.ctaButton, { backgroundColor: colors.primary }]}
                  onPress={() => setShowPaywall(true)}
                >
                  <Text style={styles.ctaButtonText}>Upgrade to Premium</Text>
                </Pressable>
                <Pressable
                  style={styles.restoreButton}
                  onPress={async () => {
                    const success = await restorePurchases();
                    if (success) {
                      Alert.alert('Restored', 'Your premium purchase has been restored!');
                    } else {
                      Alert.alert('No Purchase Found', 'No previous purchase was found to restore.');
                    }
                  }}
                >
                  <Text style={styles.restoreButtonText}>Restore Purchase</Text>
                </Pressable>
              </View>
            )}

            {isPremiumNoPartner && (
              <Pressable
                style={[styles.ctaButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/(tabs)/profile')}
              >
                <Text style={styles.ctaButtonText}>Share Your Code</Text>
              </Pressable>
            )}
          </View>

          <Paywall
            visible={showPaywall}
            onClose={() => setShowPaywall(false)}
            trigger="partner_limit"
          />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const favoriteCount = matches.filter((m) => m.isFavorite).length;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.flexContainer} edges={['top']}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Matches</Text>
            <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.countText}>{matches.length}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Pressable style={styles.headerButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={22} color={colors.primary} />
            </Pressable>
          </View>
        </Animated.View>

        {/* Chosen name banner */}
        {chosenName && chosenName.name && (
          <View style={[styles.chosenBanner, { backgroundColor: colors.secondaryLight, borderColor: colors.secondary }]}>
            <Ionicons name="trophy" size={20} color={colors.primary} />
            <Text style={[styles.chosenBannerText, { color: colors.tabActive }]}>
              Chosen: <Text style={[styles.chosenName, { color: colors.tabActive }]}>{chosenName.name.name}</Text>
            </Text>
          </View>
        )}

        {/* Sort/filter bar */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400).springify()}
          style={styles.filterBar}
        >
          <Pressable style={styles.sortButton} onPress={() => setShowSortMenu(!showSortMenu)}>
            <Ionicons name="swap-vertical-outline" size={18} color="#6B5B7B" />
            <Text style={styles.sortButtonText}>
              {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
            </Text>
            <Ionicons
              name={showSortMenu ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#6B5B7B"
            />
          </Pressable>

          {favoriteCount > 0 && (
            <View style={styles.favoriteIndicator}>
              <Ionicons name="star" size={14} color={colors.primary} />
              <Text style={[styles.favoriteCount, { color: colors.primary }]}>
                {favoriteCount} favorite{favoriteCount !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Sort menu dropdown */}
        {showSortMenu && (
          <View style={[styles.sortMenu, { shadowColor: colors.secondary }]}>
            {SORT_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.sortOption,
                  sortBy === option.value && [
                    styles.sortOptionActive,
                    { backgroundColor: colors.primaryLight },
                  ],
                ]}
                onPress={() => {
                  setSortBy(option.value);
                  setShowSortMenu(false);
                }}
              >
                <Ionicons
                  name={option.icon as keyof typeof Ionicons.glyphMap}
                  size={18}
                  color={sortBy === option.value ? colors.primary : '#6B5B7B'}
                />
                <Text
                  style={[
                    styles.sortOptionText,
                    sortBy === option.value && [
                      styles.sortOptionTextActive,
                      { color: colors.primary },
                    ],
                  ]}
                >
                  {option.label}
                </Text>
                {sortBy === option.value && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
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
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
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
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#2D1B4E',
  },
  countBadge: {
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
    // backgroundColor set dynamically via inline style
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    // borderColor set dynamically via inline style
  },
  chosenBannerText: {
    fontSize: 15,
    fontFamily: Fonts?.sans,
    color: '#92400e',
  },
  chosenName: {
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
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
    color: '#6B5B7B',
  },
  favoriteIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  favoriteCount: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    // color set dynamically via inline style
  },
  sortMenu: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    padding: 4,
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
  sortOptionActive: {},
  sortOptionText: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts?.sans,
    color: '#2D1B4E',
  },
  sortOptionTextActive: {
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
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
  listContent: {
    paddingTop: 4,
    paddingBottom: 100,
  },
  ctaContainer: {
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  ctaButton: {
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    zIndex: 10,
  },
  ctaButtonText: {
    fontSize: 15,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#fff',
  },
  restoreButton: {
    paddingVertical: 8,
    zIndex: 10,
  },
  restoreButtonText: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: '#A89BB5',
  },
});
