import { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  trigger?: 'swipe_limit' | 'partner_limit' | 'dashboard_limit';
}

const TRIGGER_MESSAGES: Record<NonNullable<PaywallProps['trigger']>, string> = {
  swipe_limit: "You've used all 25 of your free swipes",
  partner_limit: 'Connect your partner. One plan covers you both',
  dashboard_limit: 'See all your liked names',
};

const COMPARISON_ROWS = [
  { label: 'Swipes', free: '25', premium: 'Unlimited' },
  { label: 'Liked names', free: '25', premium: 'Unlimited' },
  { label: 'Partner matching', free: '\u2014', premium: 'Yes' },
];

export function Paywall({ visible, onClose, trigger = 'swipe_limit' }: PaywallProps) {
  const { colors } = useTheme();
  const { packages, purchasePremium, restorePurchases, isLoading } = usePurchases();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const hasPackages = packages.length > 0;
  // No hardcoded fallback: priceString is region-localized (e.g. CA$6.99),
  // so a hardcoded "$4.99" would show a wrong US-dollar figure to non-US
  // users until offerings load. Show no price until the real one resolves.
  const price = packages[0]?.product.priceString;

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

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconBadge, { backgroundColor: colors.secondaryLight }]}>
            <Ionicons name="star" size={32} color={colors.primary} />
          </View>
          <Text style={styles.title}>Bambino Premium</Text>
          <Text style={styles.subtitle}>{TRIGGER_MESSAGES[trigger]}</Text>
        </View>

        {/* Comparison */}
        <View style={[styles.comparison, { backgroundColor: colors.primaryLight }]}>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel} />
            <Text style={styles.comparisonHeaderFree}>Free</Text>
            <View style={[styles.premiumPill, { backgroundColor: colors.primary }]}>
              <Text style={styles.premiumPillText}>Premium</Text>
            </View>
          </View>
          {COMPARISON_ROWS.map((row, index) => (
            <View key={row.label}>
              {index > 0 && <View style={styles.rowSeparator} />}
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonLabel}>{row.label}</Text>
                <Text style={styles.comparisonValue}>{row.free}</Text>
                <Text style={[styles.comparisonValuePremium, { color: colors.primary }]}>
                  {row.premium}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Purchase button */}
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
              title={price ? `Unlock Premium - ${price}` : 'Unlock Premium'}
              onPress={handlePurchase}
              loading={isPurchasing}
              disabled={isPurchasing || isLoading}
            />
          )}
        </View>

        <Text style={styles.oneTime}>One-time purchase. No subscription.</Text>

        {/* Restore */}
        <Pressable
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={isPurchasing || isRestoring}
          accessibilityLabel="Restore previous purchase"
          accessibilityRole="button"
        >
          {isRestoring ? (
            <ActivityIndicator size="small" color="#6B5B7B" />
          ) : (
            <Text style={styles.restoreButtonText}>Restore Purchase</Text>
          )}
        </Pressable>
      </AnimatedBottomSheet>

      <CelebrationModal
        visible={showCelebration}
        onClose={handleCelebrationClose}
        title="Bambino Premium"
        subtitle="Welcome to Bambino Premium! 🎉"
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
    marginBottom: 24,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#2D1B4E',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    textAlign: 'center',
  },
  comparison: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  comparisonLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts?.sans,
    fontWeight: '500',
    color: '#6B5B7B',
  },
  comparisonHeaderFree: {
    width: 80,
    textAlign: 'center',
    fontSize: 13,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#A89BB5',
  },
  premiumPill: {
    width: 80,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: 'center',
  },
  premiumPillText: {
    fontSize: 12,
    fontFamily: Fonts?.sans,
    fontWeight: '700',
    color: '#fff',
  },
  comparisonValue: {
    width: 80,
    textAlign: 'center',
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: '#A89BB5',
  },
  comparisonValuePremium: {
    width: 80,
    textAlign: 'center',
    fontSize: 13,
    fontFamily: Fonts?.sans,
    fontWeight: '700',
  },
  rowSeparator: {
    height: 1,
    backgroundColor: '#F0EBF5',
  },
  oneTime: {
    fontSize: 12,
    fontFamily: Fonts?.sans,
    color: '#A89BB5',
    textAlign: 'center',
    marginBottom: 12,
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
