import { useState } from 'react';
import { ActivityIndicator, View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { AnimatedBottomSheet } from '@/components/ui/animated-bottom-sheet';

interface ProposalConflictSheetProps {
  visible: boolean;
  partnerProposalName: string | null;
  /** Tap "See their pick" — closes the sheet so the user can find the
   *  partner's pending proposal banner on the Matches screen. */
  onSeeTheirs: () => void;
  /** Tap "Send mine" — re-call proposeName with force=true. */
  onSendMine: () => Promise<void>;
  onClose: () => void;
}

export function ProposalConflictSheet({
  visible,
  partnerProposalName,
  onSeeTheirs,
  onSendMine,
  onClose,
}: ProposalConflictSheetProps) {
  const { colors, gradients } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendMine = async () => {
    setIsSubmitting(true);
    try {
      await onSendMine();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatedBottomSheet visible={visible} onClose={onClose} maxHeight="55%">
      <View style={styles.content}>
        <View style={styles.handleBar} />

        <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="chatbubbles-outline" size={32} color={colors.primary} />
        </View>

        <Text style={styles.title}>Heads up</Text>
        <Text style={styles.subtitle}>
          Your partner proposed {partnerProposalName ?? 'a name'} and is waiting on you. Want to see
          it first, or send yours anyway?
        </Text>

        <View style={styles.buttons}>
          <Pressable
            onPress={onSeeTheirs}
            disabled={isSubmitting}
            style={[isSubmitting && styles.disabled]}
          >
            <LinearGradient
              colors={[...gradients.buttonPrimary]}
              style={[styles.primaryButton, { shadowColor: colors.primary }]}
            >
              <Text style={styles.primaryButtonText}>See their pick</Text>
            </LinearGradient>
          </Pressable>

          <Pressable onPress={handleSendMine} disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={styles.secondaryLoader}
              />
            ) : (
              <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Send mine</Text>
            )}
          </Pressable>
        </View>
      </View>
    </AnimatedBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingBottom: 36,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginTop: 12,
    marginBottom: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#2D1B4E',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 24,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  buttons: {
    width: '100%',
    paddingHorizontal: 24,
    gap: 4,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 14,
  },
  secondaryLoader: {
    paddingVertical: 14,
  },
  disabled: {
    opacity: 0.6,
  },
});
