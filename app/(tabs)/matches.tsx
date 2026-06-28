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
import { Events, trackEvent, trackScreen } from '@/lib/analytics';
import { alertMatchMutationError } from '@/components/matches/match-error-alert';
import { Paywall } from '@/components/paywall';
import {
  MatchCard,
  MatchesHeader,
  ProposalBanner,
  DeclinedBanner,
  ProposeSheet,
  ProposalConflictSheet,
  DeclineSheet,
  CelebrationModal,
} from '@/components/matches';
import { ReportMessageSheet } from '@/components/matches/report-message-sheet';
import { SearchInput } from '@/components/dashboard/search-input';
import { NameDetailModal } from '@/components/name-detail/name-detail-modal';
import { GradientBackground } from '@/components/ui/gradient-background';
import { MatchAnimation } from '@/components/ui/match-animation';
import { LoadingScreen, useGracefulLoading } from '@/components/ui/loading-screen';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
import { ErrorToast } from '@/components/ui/error-toast';
import { Id } from '@/convex/_generated/dataModel';
import type { FunctionReturnType } from 'convex/server';
import * as Haptics from 'expo-haptics';

import type { MatchSortOption } from '@/components/matches/matches-header';

// Inferred from the server so the client can't silently drift from the actual
// getMatches return shape (#179). Adding/removing/renaming a field there now
// fails tsc at the consumer sites instead of being hidden behind a cast.
type MatchWithName = FunctionReturnType<typeof api.matches.getMatches>[number];

export default function Matches() {
  const { colors } = useTheme();
  const { isPremium } = useEffectivePremium();
  const router = useRouter();
  const [sortBy, setSortBy] = useState<MatchSortOption>('newest');
  const [searchInput, setSearchInput] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [selectedMatch, setSelectedMatch] = useState<MatchWithName | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [proposeTarget, setProposeTarget] = useState<MatchWithName | null>(null);
  const [proposalConflict, setProposalConflict] = useState<{
    matchId: Id<'matches'>;
    message: string | undefined;
    partnerProposalName: string;
  } | null>(null);
  const [showDeclineSheet, setShowDeclineSheet] = useState(false);
  const [reportMatchId, setReportMatchId] = useState<Id<'matches'> | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationName, setCelebrationName] = useState('');
  const [showUnlinkToast, setShowUnlinkToast] = useState(false);

  // Track initial mount so header animations only play once
  const hasAnimated = useRef(false);
  useEffect(() => {
    hasAnimated.current = true;
  }, []);

  const lastSeenChosenId = useRef<string | null>(null);

  // Reset state when returning to this tab
  const [focusCount, setFocusCount] = useState(0);
  useFocusEffect(
    useCallback(() => {
      trackScreen('Matches');
      setSearchInput('');
      setSubmittedSearch('');
      setFocusCount((c) => c + 1);
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
  const currentUser = useQuery(api.users.getCurrentUser);
  const pendingProposal = useQuery(api.matches.getPendingProposal);
  const declinedProposal = useQuery(api.matches.getDeclinedProposal);

  // Close the report sheet if the proposal it targets disappears (partner
  // withdrew/accepted, or unlinked) so it can't act on a stale match. (#185)
  useEffect(() => {
    if (!pendingProposal) setReportMatchId(null);
  }, [pendingProposal]);

  // Tear down any partnership-bound modal if the partner unlinks mid-session
  // (#181). Their unlink propagates via the getPartnerInfo subscription; the
  // screen re-renders to the empty state, but an open sheet would otherwise
  // stay mounted with stale data — and acting on it would fail server-side
  // (#159). Detect partner -> null, dismiss the sheets, and toast once.
  const previousPartnerIdRef = useRef(partnerInfo?.partner?._id);
  useEffect(() => {
    const currentPartnerId = partnerInfo?.partner?._id;
    const previousPartnerId = previousPartnerIdRef.current;
    if (previousPartnerId && !currentPartnerId) {
      setProposeTarget(null);
      setSelectedMatch(null);
      setShowDeclineSheet(false);
      setProposalConflict(null);
      setReportMatchId(null);
      setShowUnlinkToast(true);
    }
    previousPartnerIdRef.current = currentPartnerId;
  }, [partnerInfo?.partner?._id]);

  const proposeNameMutation = useMutation(api.matches.proposeName);
  const respondToProposalMutation = useMutation(api.matches.respondToProposal);
  const withdrawProposalMutation = useMutation(api.matches.withdrawProposal);
  const dismissDeclinedProposalMutation = useMutation(api.matches.dismissDeclinedProposal);

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

  const submitProposal = useCallback(
    async (matchId: Id<'matches'>, message: string | undefined, force: boolean) => {
      try {
        const result = await proposeNameMutation({ matchId, message, force });
        if (result && 'error' in result && result.error === 'PARTNER_HAS_PENDING_PROPOSAL') {
          // Surface the conflict via a bottom sheet (#169). Stash matchId
          // and message so the "Send mine" button can re-call with force.
          setProposeTarget(null);
          setProposalConflict({
            matchId,
            message,
            partnerProposalName: result.partnerProposalName,
          });
          return;
        }
        trackEvent(Events.PROPOSAL_SENT);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setProposeTarget(null);
        setProposalConflict(null);
      } catch (error) {
        alertMatchMutationError(error, 'Could not propose this name.');
      }
    },
    [proposeNameMutation],
  );

  const handlePropose = useCallback(
    async (message?: string) => {
      if (!proposeTarget) return;
      await submitProposal(proposeTarget._id, message, false);
    },
    [proposeTarget, submitProposal],
  );

  const handleAcceptProposal = useCallback(async () => {
    if (!pendingProposal) return;
    try {
      await respondToProposalMutation({
        matchId: pendingProposal._id,
        accept: true,
      });
      trackEvent(Events.PROPOSAL_ACCEPTED);
      setCelebrationName(pendingProposal.name?.name ?? '');
      setShowCelebration(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      alertMatchMutationError(error, 'Could not accept this proposal.');
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
        trackEvent(Events.PROPOSAL_DECLINED);
        setShowDeclineSheet(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        alertMatchMutationError(error, 'Could not decline this proposal.');
      }
    },
    [pendingProposal, respondToProposalMutation],
  );

  const handleDismissDeclined = useCallback(async () => {
    if (!declinedProposal) return;
    try {
      await dismissDeclinedProposalMutation({ matchId: declinedProposal._id });
    } catch (error) {
      alertMatchMutationError(error, 'Could not dismiss this.');
    }
  }, [declinedProposal, dismissDeclinedProposalMutation]);

  const handleWithdrawProposal = useCallback(
    async (matchId: Id<'matches'>, nameName: string) => {
      Alert.alert(
        'Withdraw Proposal?',
        `Are you sure you want to withdraw your proposal for "${nameName}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Withdraw',
            onPress: async () => {
              try {
                await withdrawProposalMutation({ matchId });
                trackEvent(Events.PROPOSAL_WITHDRAWN);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch (error) {
                alertMatchMutationError(error, 'Could not withdraw this proposal.');
              }
            },
          },
        ],
      );
    },
    [withdrawProposalMutation],
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
          currentUserId={currentUser?._id}
          onPress={() => setSelectedMatch(item)}
          onPropose={
            !item.isChosen && item.proposalStatus !== 'pending' && !pendingProposal
              ? () => setProposeTarget(item)
              : undefined
          }
          onWithdraw={
            item.proposalStatus === 'pending' && item.proposedBy === currentUser?._id
              ? () => handleWithdrawProposal(item._id, item.name.name)
              : undefined
          }
        />
      </Animated.View>
    ),
    [handleWithdrawProposal, currentUser?._id, pendingProposal],
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
              {isFreeUser ? (
                <>
                  You and your partner each swipe on names, and the ones{' '}
                  <Text style={styles.emptyDescriptionBold}>you both like</Text> become{' '}
                  <Text style={styles.emptyDescriptionBold}>matches</Text>. You’ll each need the
                  app, and{' '}
                  <Text style={styles.emptyDescriptionBold}>one Premium plan covers you both</Text>.
                </>
              ) : (
                <>
                  Your partner needs to{' '}
                  <Text style={styles.emptyDescriptionBold}>download Bambino</Text> too, then{' '}
                  <Text style={styles.emptyDescriptionBold}>enter your code</Text> to link up. Once
                  you’re connected, any name{' '}
                  <Text style={styles.emptyDescriptionBold}>you both like</Text> shows up here.
                </>
              )}
            </Text>
            <MatchAnimation key={focusCount} />
            {isFreeUser && (
              <View style={styles.ctaContainer}>
                <Pressable
                  style={[styles.ctaButton, { backgroundColor: colors.primary }]}
                  onPress={() => setShowPaywall(true)}
                >
                  <Text style={styles.ctaButtonText}>Upgrade to Premium</Text>
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
          {/* Shown when a partner unlinks mid-session (#181) — this empty
              state is the view the user lands on right after the unlink. */}
          <ErrorToast
            visible={showUnlinkToast}
            message="Your partner unlinked. Your liked names are saved."
            onDismiss={() => setShowUnlinkToast(false)}
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
              {isSearching ? (
                `No names match "${submittedSearch}"`
              ) : (
                <>
                  A match is any name you and your partner{' '}
                  <Text style={styles.emptyDescriptionBold}>both swipe right</Text> on.{' '}
                  <Text style={styles.emptyDescriptionBold}>Keep swiping</Text> — they’ll show up
                  here.
                </>
              )}
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
          entering={!hasAnimated.current ? FadeInDown.duration(400).springify() : undefined}
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
            onWithdraw={() =>
              handleWithdrawProposal(pendingProposal._id, pendingProposal.name?.name ?? '')
            }
            onReport={() => setReportMatchId(pendingProposal._id)}
          />
        )}

        {/* Declined proposal banner — shown to the proposer */}
        {declinedProposal && declinedProposal.name && (
          <DeclinedBanner
            declinerName={declinedProposal.declinerName}
            nameName={declinedProposal.name.name}
            message={declinedProposal.declineMessage}
            onDismiss={handleDismissDeclined}
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
          data={matches}
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

        {/* Proposal conflict sheet — fires when both partners try to
            propose at the same time (#169). */}
        <ProposalConflictSheet
          visible={proposalConflict !== null}
          partnerProposalName={proposalConflict?.partnerProposalName ?? null}
          onSeeTheirs={() => setProposalConflict(null)}
          onSendMine={async () => {
            if (!proposalConflict) return;
            await submitProposal(proposalConflict.matchId, proposalConflict.message, true);
          }}
          onClose={() => setProposalConflict(null)}
        />

        {/* Decline sheet */}
        <DeclineSheet
          visible={showDeclineSheet}
          nameName={pendingProposal?.name?.name ?? ''}
          onDecline={handleDeclineProposal}
          onClose={() => setShowDeclineSheet(false)}
        />
        <ReportMessageSheet
          visible={reportMatchId !== null}
          matchId={reportMatchId}
          onClose={() => setReportMatchId(null)}
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
  emptyDescriptionBold: {
    fontWeight: '700',
  },
  listContent: {
    // Top padding so the first card's overhanging "Proposed"/"Chosen" badge
    // (position absolute, top: -8) isn't clipped by the list's top edge —
    // mirrors the inter-card gap every other card already has above it.
    paddingTop: 12,
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
});
