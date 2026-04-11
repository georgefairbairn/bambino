import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useQuery, useMutation } from 'convex/react';
import { Ionicons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '@/convex/_generated/api';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { useEffectivePremium } from '@/hooks/use-effective-premium';
import { usePurchases } from '@/hooks/use-purchases';
import { Paywall } from '@/components/paywall';
import { MatchCard, MatchesHeader, ProposalBanner, ProposeSheet, DeclineSheet, CelebrationModal } from '@/components/matches';
import { SearchInput } from '@/components/dashboard/search-input';
import { NameDetailModal } from '@/components/name-detail/name-detail-modal';
import { GradientBackground } from '@/components/ui/gradient-background';
import { MatchAnimation } from '@/components/ui/match-animation';
import { LoadingScreen, useGracefulLoading } from '@/components/ui/loading-screen';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
import { Doc, Id } from '@/convex/_generated/dataModel';
import * as Haptics from 'expo-haptics';

import type { MatchSortOption } from '@/components/matches/matches-header';

type MatchWithName = {
  _id: Id<'matches'>;
  nameId: Id<'names'>;
  user1Id: Id<'users'>;
  user2Id: Id<'users'>;
  isFavorite?: boolean;
  notes?: string;
  rank?: number;
  isChosen?: boolean;
  proposedBy?: Id<'users'>;
  proposedAt?: number;
  proposalMessage?: string;
  proposalStatus?: 'pending' | 'accepted' | 'declined';
  respondedAt?: number;
  declineMessage?: string;
  matchedAt: number;
  createdAt: number;
  updatedAt: number;
  name: Doc<'names'>;
};

export default function Matches() {
  const { colors } = useTheme();
  const { isPremium } = useEffectivePremium();
  const { restorePurchases } = usePurchases();
  const router = useRouter();
  const [sortBy, setSortBy] = useState<MatchSortOption>('newest');
  const [searchInput, setSearchInput] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [selectedMatch, setSelectedMatch] = useState<MatchWithName | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [proposeTarget, setProposeTarget] = useState<MatchWithName | null>(null);
  const [showDeclineSheet, setShowDeclineSheet] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationName, setCelebrationName] = useState('');

  // Track initial mount so header animations only play once
  const hasAnimated = useRef(false);
  useEffect(() => {
    hasAnimated.current = true;
  }, []);

  const lastSeenChosenId = useRef<string | null>(null);

  // Clear search when returning to this tab
  useFocusEffect(
    useCallback(() => {
      setSearchInput('');
      setSubmittedSearch('');
    }, []),
  );

  const handleSearchSubmit = () => {
    setSubmittedSearch(searchInput);
  };

  const handleSearchClear = () => {
    setSubmittedSearch('');
  };

  const partnerInfo = useQuery(api.partners.getPartnerInfo);
  const hasPartner = partnerInfo?.partner !== null && partnerInfo?.partner !== undefined;

  const matches = useQuery(api.matches.getMatches, {
    sortBy,
    search: submittedSearch || undefined,
  });
  const chosenName = useQuery(api.matches.getChosenName);
  const updateMatch = useMutation(api.matches.updateMatch);
  const currentUser = useQuery(api.users.getCurrentUser);
  const pendingProposal = useQuery(api.matches.getPendingProposal);
  const proposeNameMutation = useMutation(api.matches.proposeName);
  const respondToProposalMutation = useMutation(api.matches.respondToProposal);
  const withdrawProposalMutation = useMutation(api.matches.withdrawProposal);

  // Task 13: Trigger celebration for proposer when partner accepts
  useEffect(() => {
    if (!chosenName || !chosenName.name) return;

    const chosenId = chosenName._id;
    if (chosenId !== lastSeenChosenId.current) {
      if (
        lastSeenChosenId.current !== null &&
        chosenName.proposedBy === currentUser?._id &&
        chosenName.proposalStatus === 'accepted'
      ) {
        setCelebrationName(chosenName.name.name);
        setShowCelebration(true);
      }
      lastSeenChosenId.current = chosenId;
    }
  }, [chosenName, currentUser?._id]);

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

  const handlePropose = useCallback(
    async (message?: string) => {
      if (!proposeTarget) return;
      try {
        await proposeNameMutation({
          matchId: proposeTarget._id,
          message,
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setProposeTarget(null);
      } catch (error) {
        Sentry.captureException(error);
        Alert.alert('Error', 'Failed to propose name. Please try again.');
      }
    },
    [proposeTarget, proposeNameMutation],
  );

  const handleAcceptProposal = useCallback(async () => {
    if (!pendingProposal) return;
    try {
      await respondToProposalMutation({
        matchId: pendingProposal._id,
        accept: true,
      });
      setCelebrationName(pendingProposal.name?.name ?? '');
      setShowCelebration(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Sentry.captureException(error);
      Alert.alert('Error', 'Failed to accept proposal. Please try again.');
    }
  }, [pendingProposal, respondToProposalMutation]);

  const handleDeclineProposal = useCallback(
    async (message?: string) => {
      if (!pendingProposal) return;
      try {
        await respondToProposalMutation({
          matchId: pendingProposal._id,
          accept: false,
          message,
        });
        setShowDeclineSheet(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        Sentry.captureException(error);
        Alert.alert('Error', 'Failed to decline proposal. Please try again.');
      }
    },
    [pendingProposal, respondToProposalMutation],
  );

  const handleWithdrawProposal = useCallback(async () => {
    if (!pendingProposal) return;
    Alert.alert(
      'Withdraw Proposal?',
      `Are you sure you want to withdraw your proposal for "${pendingProposal.name?.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          onPress: async () => {
            try {
              await withdrawProposalMutation({
                matchId: pendingProposal._id,
              });
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch (error) {
              Sentry.captureException(error);
              Alert.alert('Error', 'Failed to withdraw proposal. Please try again.');
            }
          },
        },
      ],
    );
  }, [pendingProposal, withdrawProposalMutation]);

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
          currentUserId={currentUser?._id}
          onPress={() => setSelectedMatch(item)}
          onToggleFavorite={() => handleToggleFavorite(item._id, item.isFavorite)}
          onPropose={
            !item.isChosen && item.proposalStatus !== 'pending'
              ? () => setProposeTarget(item)
              : undefined
          }
          onWithdraw={
            item.proposalStatus === 'pending' && item.proposedBy === currentUser?._id
              ? handleWithdrawProposal
              : undefined
          }
        />
      </Animated.View>
    ),
    [handleToggleFavorite, handleWithdrawProposal, currentUser?._id],
  );

  const keyExtractor = useCallback((item: MatchWithName) => item._id, []);

  const { showLoading, loadingProps } = useGracefulLoading(matches !== undefined);

  if (showLoading) {
    return <LoadingScreen {...loadingProps} />;
  }

  // Empty states for free users or users without partners
  if (!isPremium || !hasPartner) {
    const isFreeUser = !isPremium;

    return (
      <GradientBackground>
        <SafeAreaView style={styles.flexContainer} edges={['top']}>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>
              {isFreeUser ? 'Match With Your Partner' : 'Invite Your Partner'}
            </Text>
            <Text style={styles.emptyDescription}>
              {isFreeUser
                ? 'Upgrade to connect with your partner and discover the baby names you both love.'
                : 'Share your partner code and start discovering the names you both love. Matches appear when you both swipe right!'}
            </Text>
            <MatchAnimation />
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
                      Alert.alert(
                        'No Purchase Found',
                        'No previous purchase was found to restore.',
                      );
                    }
                  }}
                >
                  <Text style={styles.restoreButtonText}>Restore Purchase</Text>
                </Pressable>
              </View>
            )}
            {!isFreeUser && (
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

  // Data loading state
  if (matches === undefined) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.flexContainer} edges={['top']}>
          <MatchesHeader
            count={0}
            sortBy={sortBy}
            onSortChange={setSortBy}
            onShare={handleShare}
            favoriteCount={0}
          />
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

  // Empty matches state
  if (matches.length === 0) {
    const isSearching = submittedSearch.length > 0;
    return (
      <GradientBackground>
        <SafeAreaView style={styles.flexContainer} edges={['top']}>
          <MatchesHeader
            count={0}
            sortBy={sortBy}
            onSortChange={setSortBy}
            onShare={handleShare}
            favoriteCount={0}
          />
          <SearchInput
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmit={handleSearchSubmit}
            onClear={handleSearchClear}
          />
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>
              {isSearching ? 'No Results Found' : 'No Matches Yet'}
            </Text>
            <Text style={styles.emptyDescription}>
              {isSearching
                ? `No names match "${submittedSearch}"`
                : "When you and your partner both love the same name — it's a match! Keep swiping to find your favourites."}
            </Text>
            {!isSearching && (
              <Pressable
                style={[styles.ctaButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/(tabs)/explore')}
              >
                <Text style={styles.ctaButtonText}>Start Swiping</Text>
              </Pressable>
            )}
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const favoriteCount = matches.filter((m) => m.isFavorite).length;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.flexContainer} edges={['top']}>
        <Animated.View
          entering={
            !hasAnimated.current ? FadeInDown.duration(400).springify() : undefined
          }
        >
          <MatchesHeader
            count={matches.length}
            sortBy={sortBy}
            onSortChange={setSortBy}
            onShare={handleShare}
            favoriteCount={favoriteCount}
          />
          <SearchInput
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmit={handleSearchSubmit}
            onClear={handleSearchClear}
          />
        </Animated.View>

        {/* Proposal banner */}
        {pendingProposal && pendingProposal.name && (
          <ProposalBanner
            proposerName={pendingProposal.proposerName}
            nameName={pendingProposal.name.name}
            message={pendingProposal.proposalMessage}
            isCurrentUserProposer={pendingProposal.isCurrentUserProposer}
            onAccept={handleAcceptProposal}
            onDecline={() => setShowDeclineSheet(true)}
            onWithdraw={handleWithdrawProposal}
          />
        )}

        {/* Chosen name banner */}
        {chosenName && chosenName.name && (
          <View
            style={[
              styles.chosenBanner,
              { backgroundColor: colors.secondaryLight, borderColor: colors.secondary },
            ]}
          >
            <Ionicons name="trophy" size={20} color={colors.primary} />
            <Text style={[styles.chosenBannerText, { color: colors.tabActive }]}>
              Chosen:{' '}
              <Text style={[styles.chosenName, { color: colors.tabActive }]}>
                {chosenName.name.name}
              </Text>
            </Text>
          </View>
        )}

        {/* Match list */}
        <FlatList
          data={matches as MatchWithName[]}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />

        {/* Name detail modal */}
        <NameDetailModal
          visible={selectedMatch !== null}
          name={selectedMatch?.name ?? null}
          context="match"
          onClose={() => setSelectedMatch(null)}
        />

        {/* Propose sheet */}
        <ProposeSheet
          visible={proposeTarget !== null}
          name={proposeTarget?.name ?? null}
          onPropose={handlePropose}
          onClose={() => setProposeTarget(null)}
        />

        {/* Decline sheet */}
        <DeclineSheet
          visible={showDeclineSheet}
          nameName={pendingProposal?.name?.name ?? ''}
          onDecline={handleDeclineProposal}
          onClose={() => setShowDeclineSheet(false)}
        />

        {/* Celebration modal */}
        <CelebrationModal
          visible={showCelebration}
          nameName={celebrationName}
          onClose={() => setShowCelebration(false)}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  chosenBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  chosenBannerText: {
    fontSize: 15,
    fontFamily: Fonts?.sans,
  },
  chosenName: {
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
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
