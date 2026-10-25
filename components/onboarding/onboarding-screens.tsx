import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from 'convex/react';
import * as Sentry from '@sentry/react-native';
import { api } from '@/convex/_generated/api';
import { BUTTON_TEXT } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { Events, trackEvent } from '@/lib/analytics';
import { shareInvite } from '@/lib/share-invite';
import { PartnerLinkModal } from '@/components/partner/partner-link-modal';
import { WelcomeSplash } from './welcome-splash';
import { SwipeDemo } from './swipe-demo';
import { MultiplayerIntro } from './multiplayer-intro';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TOTAL_SCREENS = 3;

interface OnboardingScreensProps {
  onComplete: () => void;
}

const SCREENS = [
  { id: '1', component: WelcomeSplash },
  { id: '2', component: SwipeDemo },
  { id: '3', component: MultiplayerIntro },
];

export function OnboardingScreens({ onComplete }: OnboardingScreensProps) {
  const { colors, gradients } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Fire onboarding_started once when the carousel mounts
  useEffect(() => {
    trackEvent(Events.ONBOARDING_STARTED);
  }, []);

  const partnerInfo = useQuery(api.partners.getPartnerInfo);
  const [showLinkModal, setShowLinkModal] = useState(false);

  // `action` records how they left the last slide: sent an invite, linked
  // with their partner's code, or skipped.
  const finish = useCallback(
    (action: 'invited' | 'linked' | 'skipped') => {
      trackEvent(Events.ONBOARDING_COMPLETED, { action });
      onComplete();
    },
    [onComplete],
  );

  const handleNext = useCallback(() => {
    const nextIndex = currentIndex + 1;
    flatListRef.current?.scrollToIndex({ index: nextIndex });
    setCurrentIndex(nextIndex);
    trackEvent(Events.ONBOARDING_SLIDE_ADVANCED, { slide_index: nextIndex });
  }, [currentIndex]);

  // The last slide ends on the invite: it's the moment someone who installed
  // to pick a name with their partner is most likely to send it. A cancelled
  // share sheet keeps them here to choose again.
  const handleInvite = useCallback(async () => {
    if (!partnerInfo?.shareCode) return;
    try {
      if (await shareInvite(partnerInfo.shareCode, 'onboarding')) finish('invited');
    } catch (error) {
      Sentry.captureException(error);
    }
  }, [partnerInfo?.shareCode, finish]);

  // Linking from "I have a code" finishes onboarding once the link lands. Keyed
  // on the flow having started, not the modal being open: the modal closes
  // itself on success before getPartnerInfo catches up.
  const [linkFlowStarted, setLinkFlowStarted] = useState(false);
  const linked = !!partnerInfo?.partner;
  useEffect(() => {
    if (linkFlowStarted && linked) finish('linked');
  }, [linkFlowStarted, linked, finish]);

  const isLastScreen = currentIndex === TOTAL_SCREENS - 1;

  const renderScreen = useCallback(
    ({ item, index }: { item: (typeof SCREENS)[number]; index: number }) => {
      const Screen = item.component;
      return (
        <View style={styles.screenWrapper}>
          <Screen isActive={index === currentIndex} />
        </View>
      );
    },
    [currentIndex],
  );

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={[...gradients.screenBg]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      {/* Screen carousel */}
      <FlatList
        ref={flatListRef}
        data={SCREENS}
        renderItem={renderScreen}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        scrollEnabled={false}
        scrollEventThrottle={16}
      />

      {/* Bottom area: dots + button */}
      <View style={styles.bottomArea}>
        {/* Pagination dots */}
        <View
          style={styles.dotsRow}
          accessibilityRole="progressbar"
          accessibilityLabel={`Page ${currentIndex + 1} of ${TOTAL_SCREENS}`}
        >
          {Array.from({ length: TOTAL_SCREENS }).map((_, i) => (
            <View
              key={i}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[styles.dot, i === currentIndex ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>

        {/* Next, or Invite Your Partner on the last slide */}
        <Pressable
          onPress={isLastScreen ? handleInvite : handleNext}
          disabled={isLastScreen && !partnerInfo?.shareCode}
          accessibilityRole="button"
        >
          <LinearGradient
            colors={[...gradients.buttonPrimary]}
            style={styles.ctaButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.ctaText}>{isLastScreen ? 'Invite Your Partner' : 'Next'}</Text>
          </LinearGradient>
        </Pressable>

        {isLastScreen && (
          <View style={styles.secondaryRow}>
            <Pressable
              onPress={() => {
                setLinkFlowStarted(true);
                setShowLinkModal(true);
              }}
              accessibilityRole="button"
              hitSlop={8}
            >
              <Text style={[styles.secondaryText, { color: colors.tabActive }]}>I have a code</Text>
            </Pressable>
            <Text style={styles.secondaryDivider}>·</Text>
            <Pressable onPress={() => finish('skipped')} accessibilityRole="button" hitSlop={8}>
              <Text style={[styles.secondaryText, { color: colors.tabActive }]}>Skip for now</Text>
            </Pressable>
          </View>
        )}
      </View>

      <PartnerLinkModal visible={showLinkModal} onClose={() => setShowLinkModal(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenWrapper: {
    width: SCREEN_WIDTH,
    flex: 1,
    overflow: 'hidden',
  },
  bottomArea: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2D1B4E',
  },
  dotActive: {
    width: 20,
    opacity: 1,
  },
  dotInactive: {
    width: 6,
    opacity: 0.25,
  },
  ctaButton: {
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 14,
    minWidth: 220,
    alignItems: 'center',
  },
  ctaText: {
    ...BUTTON_TEXT.cta,
    color: '#FFFFFF',
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  secondaryText: {
    ...BUTTON_TEXT.link,
  },
  secondaryDivider: {
    color: '#A89BB5',
    fontSize: 14,
  },
});
