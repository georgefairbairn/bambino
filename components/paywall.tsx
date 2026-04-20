import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePurchases } from '@/hooks/use-purchases';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { AnimatedBottomSheet } from '@/components/ui/animated-bottom-sheet';
import { GradientButton } from '@/components/ui/gradient-button';
import { trackEvent, Events } from '@/lib/analytics';

interface PaywallProps {
  visible: boolean;
  onClose: () => void;
  trigger?: 'swipe_limit' | 'partner_limit' | 'dashboard_limit';
}

const TRIGGER_MESSAGES: Record<NonNullable<PaywallProps['trigger']>, string> = {
  swipe_limit: "You've used all 25 free swipes",
  partner_limit: 'Connect with your partner',
  dashboard_limit: 'See all your liked names',
};

const COMPARISON_ROWS = [
  { label: 'Swipes', free: '25', premium: 'Unlimited' },
  { label: 'Liked names', free: '25', premium: 'Unlimited' },
  { label: 'Partner', free: '\u2014', premium: 'Yes' },
];

export function Paywall({ visible, onClose, trigger = 'swipe_limit' }: PaywallProps) {
  const { colors } = useTheme();
  const { packages, purchasePremium, restorePurchases, isLoading } = usePurchases();
  const [isPurchasing, setIsPurchasing] = useState(false);

  const hasPackages = packages.length > 0;
  const price = packages[0]?.product.priceString ?? '$4.99';

  const handlePurchase = async () => {
    setIsPurchasing(true);
    try {
      const success = await purchasePremium();
      if (success) {
        trackEvent(Events.PURCHASE_COMPLETED, { trigger });
        onClose();
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsPurchasing(true);
    try {
      const success = await restorePurchases();
      if (success) {
        onClose();
        Alert.alert('Restored', 'Your premium purchase has been restored!');
      } else {
        Alert.alert('No Purchase Found', 'No previous purchase was found to restore.');
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <AnimatedBottomSheet
      visible={visible}
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
            title={`Unlock Premium - ${price}`}
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
        disabled={isPurchasing}
        accessibilityLabel="Restore previous purchase"
        accessibilityRole="button"
      >
        <Text style={styles.restoreButtonText}>Restore Purchase</Text>
      </Pressable>
    </AnimatedBottomSheet>
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
    fontSize: 14,
    fontFamily: Fonts?.sans,
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
