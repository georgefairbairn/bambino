import { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { usePurchases } from '@/hooks/use-purchases';
import { BUTTON_TEXT, Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { AnimatedBottomSheet } from '@/components/ui/animated-bottom-sheet';
import { GradientButton } from '@/components/ui/gradient-button';
import { CelebrationModal } from '@/components/matches/celebration-modal';
import { trackEvent, Events } from '@/lib/analytics';

interface PaywallProps {
  visible: boolean;
  onClose: () => void;
  trigger?: 'match_limit';
}

function pluralMatch(n: number) {
  return n === 1 ? 'match' : 'matches';
}

function pluralName(n: number) {
  return n === 1 ? 'name' : 'names';
}

function seeItOrAll(n: number) {
  return n === 1 ? 'it' : 'them all';
}

export function Paywall({ visible, onClose, trigger = 'match_limit' }: PaywallProps) {
  const { colors } = useTheme();
  const { packages, purchasePremium, restorePurchases, isLoading } = usePurchases();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const matchAccess = useQuery(api.matches.getMatchAccess);
  const partnerInfo = useQuery(api.partners.getPartnerInfo);

  const hasPackages = packages.length > 0;
  // No hardcoded fallback: priceString is region-localized (e.g. CA$6.99),
  // so a hardcoded "$4.99" would show a wrong US-dollar figure to non-US
  // users until offerings load. Show no price until the real one resolves.
  const price = packages[0]?.product.priceString;

  // Locked count: only treat as "known" when the query has resolved AND locked > 0.
  // Never render "0 more matches" — fall back to the neutral headline instead.
  const locked = matchAccess?.locked ?? 0;
  const hasCount = matchAccess !== undefined && locked > 0;

  const partnerName: string | undefined = partnerInfo?.partner?.name;

  // Headline
  const headline = hasCount ? `${locked} more ${pluralMatch(locked)}` : 'Unlock all your matches';

  // Subcopy
  let subcopy: string;
  if (hasCount) {
    const intro = partnerName
      ? `You and ${partnerName} both liked ${locked} more ${pluralName(locked)}.`
      : `You both liked ${locked} more ${pluralName(locked)}.`;
    subcopy = `${intro} Unlock to see ${seeItOrAll(locked)}.`;
  } else {
    subcopy = 'See every name you and your partner both liked.';
  }

  // CTA label
  let ctaLabel: string;
  if (hasCount) {
    if (locked === 1) {
      ctaLabel = price ? `See Your Other Match — ${price}` : 'See Your Other Match';
    } else {
      ctaLabel = price ? `See All ${locked} Matches — ${price}` : `See All ${locked} Matches`;
    }
  } else {
    ctaLabel = price ? `Unlock All Matches — ${price}` : 'Unlock All Matches';
  }

  useEffect(() => {
    if (visible) trackEvent(Events.PAYWALL_SHOWN, { trigger });
  }, [visible, trigger]);

  const handlePurchase = async () => {
    setIsPurchasing(true);
    trackEvent(Events.PURCHASE_ATTEMPTED, { trigger });
    try {
      const success = await purchasePremium();
      if (success) {
        trackEvent(Events.PURCHASE_COMPLETED, { trigger });
        setShowCelebration(true);
      } else {
        trackEvent(Events.PURCHASE_FAILED, { trigger, reason: 'cancelled_or_failed' });
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleCelebrationClose = () => {
    setShowCelebration(false);
    onClose();
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const success = await restorePurchases();
      if (success) {
        trackEvent(Events.PURCHASE_RESTORED);
        onClose();
        Alert.alert('Restored', 'Your premium purchase has been restored!');
      } else {
        Alert.alert('No Purchase Found', 'No previous purchase was found to restore.');
      }
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <>
      <AnimatedBottomSheet
        visible={visible && !showCelebration}
        onClose={onClose}
        style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 }}
      >
        {/* Close button */}
        <Pressable
          style={styles.closeButton}
          onPress={onClose}
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={24} color="#6B5B7B" />
        </Pressable>

        {/* Count-led headline */}
        <View style={styles.header}>
          <Text style={styles.headline}>{headline}</Text>
          <Text style={styles.subcopy}>{subcopy}</Text>
        </View>

        {/* Divider + free-features reassurance */}
        <View style={[styles.reassurance, { backgroundColor: colors.primaryLight }]}>
          <Text style={styles.freeFeatures}>
            <Text style={styles.freeFeaturesLabel}>Always free:</Text>
            {' unlimited swiping, unlimited liked names, partner linking.'}
          </Text>
        </View>

        {/* One-time framing */}
        <Text style={styles.oneTime}>One purchase covers you both. No subscription.</Text>

        {/* Purchase button — never blocked on count loading */}
        <View style={{ marginBottom: 8 }}>
          {!hasPackages && !isLoading ? (
            <View style={styles.errorState}>
              <Text style={styles.errorText}>Unable to load pricing. Check your connection.</Text>
              <Pressable onPress={onClose}>
                <Text style={[styles.restoreButtonText, { color: colors.primary }]}>Dismiss</Text>
              </Pressable>
            </View>
          ) : (
            <GradientButton
              title={ctaLabel}
              onPress={handlePurchase}
              loading={isPurchasing}
              disabled={isPurchasing || isLoading}
            />
          )}
        </View>

        {/* Restore */}
        <Pressable
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={isPurchasing || isRestoring}
          accessibilityLabel="Restore previous purchase"
          accessibilityRole="button"
        >
          {isRestoring ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.restoreButtonText, { color: colors.primary }]}>
              Restore Purchase
            </Text>
          )}
        </Pressable>
      </AnimatedBottomSheet>

      <CelebrationModal
        visible={showCelebration}
        onClose={handleCelebrationClose}
        title="Bambino Premium"
        subtitle="Welcome to Bambino Premium!"
        primaryButtonLabel="Start Exploring"
        onPrimaryPress={handleCelebrationClose}
        hideShare
      />
    </>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headline: {
    fontSize: 28,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#2D1B4E',
    textAlign: 'center',
    marginBottom: 8,
  },
  subcopy: {
    fontSize: 15,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    textAlign: 'center',
    lineHeight: 22,
  },
  reassurance: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  freeFeatures: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    lineHeight: 20,
  },
  freeFeaturesLabel: {
    fontWeight: '600',
    color: '#2D1B4E',
  },
  oneTime: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    textAlign: 'center',
    marginBottom: 16,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  restoreButtonText: {
    ...BUTTON_TEXT.link,
    color: '#6B5B7B',
  },
  errorState: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  errorText: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    textAlign: 'center',
  },
});
