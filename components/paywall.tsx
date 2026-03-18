import { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePurchases } from '@/hooks/use-purchases';
import { Fonts } from '@/constants/theme';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
import { useTheme } from '@/contexts/theme-context';

interface PaywallProps {
  visible: boolean;
  onClose: () => void;
  trigger?: 'search_limit' | 'swipe_limit' | 'origin_filter' | 'partner_limit';
}

const TRIGGER_MESSAGES = {
  search_limit: 'Create unlimited searches',
  swipe_limit: "You've used all 25 free swipes",
  origin_filter: 'Unlock all name filters',
  partner_limit: 'Connect with your partner',
};

const FEATURES = [
  { icon: 'swap-horizontal-outline' as const, text: 'Unlimited swipes' },
  { icon: 'people-outline' as const, text: 'Partner connection' },
  { icon: 'infinite-outline' as const, text: 'Unlimited searches' },
  { icon: 'globe-outline' as const, text: 'All origin filters' },
];

export function Paywall({ visible, onClose, trigger = 'search_limit' }: PaywallProps) {
  const { colors } = useTheme();
  const { packages, purchasePremium, restorePurchases, isLoading } = usePurchases();
  const [isPurchasing, setIsPurchasing] = useState(false);

  const price = packages[0]?.product.priceString ?? '$4.99';

  const handlePurchase = async () => {
    setIsPurchasing(true);
    try {
      const success = await purchasePremium();
      if (success) {
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
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Close button */}
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#6B5B7B" />
          </Pressable>

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconBadge, { backgroundColor: colors.secondaryLight }]}>
              <Ionicons name="star" size={32} color="#f59e0b" />
            </View>
            <Text style={styles.title}>Bambino Premium</Text>
            <Text style={styles.subtitle}>{TRIGGER_MESSAGES[trigger]}</Text>
          </View>

          {/* Features */}
          <View style={styles.features}>
            {FEATURES.map((feature) => (
              <View key={feature.text} style={styles.featureRow}>
                <Ionicons name={feature.icon} size={22} color={colors.primary} />
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>

          {/* Comparison */}
          <View style={[styles.comparison, { backgroundColor: colors.surfaceSubtle }]}>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonLabel} />
              <Text style={styles.comparisonHeader}>Free</Text>
              <Text
                style={[styles.comparisonHeader, styles.premiumHeader, { color: colors.primary }]}
              >
                Premium
              </Text>
            </View>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonLabel}>Swipes</Text>
              <Text style={styles.comparisonValue}>25</Text>
              <Text
                style={[styles.comparisonValue, styles.premiumValue, { color: colors.primary }]}
              >
                Unlimited
              </Text>
            </View>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonLabel}>Partner</Text>
              <Text style={styles.comparisonValue}>No</Text>
              <Text
                style={[styles.comparisonValue, styles.premiumValue, { color: colors.primary }]}
              >
                Yes
              </Text>
            </View>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonLabel}>Searches</Text>
              <Text style={styles.comparisonValue}>1</Text>
              <Text
                style={[styles.comparisonValue, styles.premiumValue, { color: colors.primary }]}
              >
                Unlimited
              </Text>
            </View>
          </View>

          {/* Purchase button */}
          <Pressable
            style={[
              styles.purchaseButton,
              { backgroundColor: colors.primary },
              isPurchasing && styles.buttonDisabled,
            ]}
            onPress={handlePurchase}
            disabled={isPurchasing || isLoading}
          >
            {isPurchasing ? (
              <LoadingIndicator size="small" />
            ) : (
              <Text style={styles.purchaseButtonText}>Unlock Premium - {price}</Text>
            )}
          </Pressable>

          <Text style={styles.oneTime}>One-time purchase. No subscription.</Text>

          {/* Restore */}
          <Pressable style={styles.restoreButton} onPress={handleRestore} disabled={isPurchasing}>
            <Text style={styles.restoreButtonText}>Restore Purchase</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
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
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#2D1B4E',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    textAlign: 'center',
  },
  features: {
    gap: 12,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    color: '#2D1B4E',
  },
  comparison: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 8,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  comparisonLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
  },
  comparisonHeader: {
    width: 80,
    textAlign: 'center',
    fontSize: 13,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#A89BB5',
  },
  premiumHeader: {
    fontWeight: '600',
  },
  comparisonValue: {
    width: 80,
    textAlign: 'center',
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: '#A89BB5',
  },
  premiumValue: {
    fontWeight: '600',
  },
  purchaseButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  purchaseButtonText: {
    fontSize: 17,
    fontFamily: Fonts?.sans,
    fontWeight: '700',
    color: '#fff',
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
  buttonDisabled: {
    opacity: 0.6,
  },
});
