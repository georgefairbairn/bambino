import { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

function pluralName(n: number) {
  return n === 1 ? 'name' : 'names';
}

/**
 * One half of the couple, as an initial on a themed gradient.
 *
 * Deliberately NOT the profile photo: most accounts carry Clerk's default
 * avatar rather than a real upload, so photos render as two identical purple
 * placeholders that clash with every candy theme. An initial is always legible,
 * always on-palette, and still unmistakably a person.
 */
function Avatar({ name, gradient }: { name?: string | null; gradient: [string, string] }) {
  // A partner who hasn't set a name yet gets a person glyph, not a "?" — the
  // question mark reads as an error rather than as someone.
  const initial = (name ?? '').trim().charAt(0).toUpperCase();
  return (
    <View style={styles.avatarRing}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.avatar}
      >
        {initial ? (
          <Text style={styles.avatarInitial}>{initial}</Text>
        ) : (
          <Ionicons name="person" size={28} color="#fff" />
        )}
      </LinearGradient>
    </View>
  );
}

export function Paywall({ visible, onClose, trigger = 'match_limit' }: PaywallProps) {
  const { colors, gradients } = useTheme();
  const { packages, purchasePremium, restorePurchases, isLoading } = usePurchases();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const matchAccess = useQuery(api.matches.getMatchAccess);
  const partnerInfo = useQuery(api.partners.getPartnerInfo);
  const currentUser = useQuery(api.users.getCurrentUser);

  const hasPackages = packages.length > 0;
  // No hardcoded fallback: priceString is region-localized (e.g. CA$6.99),
  // so a hardcoded "$4.99" would show a wrong US-dollar figure to non-US
  // users until offerings load. Show no price until the real one resolves.
  const price = packages[0]?.product.priceString;

  // The count is stated exactly ONCE, as a fact about the couple rather than as
  // a paywall tally. It is deliberately absent from the CTA and the benefits so
  // nothing on the sheet can contradict anything else.
  const locked = matchAccess?.locked ?? 0;
  const total = matchAccess?.total ?? 0;
  const visibleCount = matchAccess?.visible ?? 0;
  const hasCount = matchAccess !== undefined && locked > 0;

  const partnerName: string | undefined = partnerInfo?.partner?.name;
  const couple = partnerName ? `You and ${partnerName}` : 'You and your partner';

  const title = hasCount
    ? `${couple} both liked ${total} ${pluralName(total)}`
    : 'Unlock every match';
  const subtitle = hasCount
    ? `You’ve only seen ${visibleCount === 1 ? 'one' : visibleCount}. Unlock every match and propose the name you agree on.`
    : 'See every name you both liked, and propose the one you agree on.';

  // Purchase is never blocked on the count loading, so the CTA carries no number.
  const ctaLabel = price ? `Unlock for ${price}` : 'Unlock';

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

        {/* Circular element -> title -> subtitle: the same rhythm as
            PushPrimingSheet and ProposalConflictSheet, except the circle is the
            two of you rather than a generic icon. */}
        <View style={styles.avatarPair}>
          <Avatar name={currentUser?.name} gradient={gradients.buttonPrimary as [string, string]} />
          <View style={styles.avatarOverlap}>
            <Avatar
              name={partnerInfo?.partner?.name}
              gradient={[colors.secondary, colors.primary]}
            />
          </View>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={[styles.reassurance, { backgroundColor: colors.primaryLight }]}>
          <Text style={styles.freeFeatures}>
            <Text style={styles.freeFeaturesLabel}>Always free:</Text>
            {' swiping, your shortlist, and partner linking.'}
          </Text>
        </View>

        {/* Reassurance sits before the button, not between the two actions. */}
        <Text style={styles.oneTime}>One purchase. No subscription. Covers you both.</Text>

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
  avatarPair: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarOverlap: {
    marginLeft: -18,
  },
  avatarRing: {
    borderWidth: 3,
    borderColor: '#fff',
    borderRadius: 36,
    overflow: 'hidden',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 26,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#fff',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  // Matches PushPrimingSheet's title/subtitle scale.
  title: {
    fontSize: 22,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#2D1B4E',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
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
