import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Share } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { Confetti } from '@/components/ui/confetti';
import * as Haptics from 'expo-haptics';
import * as Sentry from '@sentry/react-native';

interface CelebrationModalProps {
  visible: boolean;
  onClose: () => void;
  /** Match-acceptance API: when set (and `title` is not), the headline shows the name and subtitle defaults to "You both chose {nameName}". */
  nameName?: string;
  /** Generalized headline. Falls back to `nameName` for the match-acceptance flow. */
  title?: string;
  /** Generalized subtitle. Falls back to `You both chose ${nameName}`. */
  subtitle?: string;
  /** Primary CTA label. Defaults to "Share with Family" (which triggers Share). */
  primaryButtonLabel?: string;
  /** Primary CTA handler. Defaults to opening the system share sheet for the chosen name. */
  onPrimaryPress?: () => void;
  /** Secondary CTA label. Defaults to "Done". */
  secondaryButtonLabel?: string;
  /** Hide the share button styling/Share-sheet default, e.g. for the Premium celebration. */
  hideShare?: boolean;
}

export function CelebrationModal({
  visible,
  onClose,
  nameName,
  title,
  subtitle,
  primaryButtonLabel,
  onPrimaryPress,
  secondaryButtonLabel = 'Done',
  hideShare = false,
}: CelebrationModalProps) {
  const { colors } = useTheme();

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [visible]);

  const handleShare = async () => {
    if (!nameName) return;
    try {
      await Share.share({
        message: `We've chosen a name! ${nameName}\n\nDiscovered together on Bambino`,
        title: "We've chosen a name!",
      });
    } catch (err: unknown) {
      // RN Share resolves (not throws) on user cancel — any throw here is a
      // real failure (no share extension on simulator, sandbox/asset errors),
      // so report it instead of swallowing silently (#206).
      Sentry.captureException(err, { tags: { flow: 'share_match' } });
    }
  };

  const headline = title ?? nameName ?? '';
  const subtitleText = subtitle ?? (nameName ? `You both chose ${nameName}` : '');
  const resolvedPrimaryLabel = primaryButtonLabel ?? (hideShare ? 'Continue' : 'Share with Family');
  const resolvedPrimaryPress = onPrimaryPress ?? (hideShare ? onClose : handleShare);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <Confetti visible={visible} />
      <View style={styles.overlay}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.content}>
          <Animated.Text entering={ZoomIn.delay(200).duration(500).springify()} style={styles.name}>
            {headline}
          </Animated.Text>

          {subtitleText.length > 0 && (
            <Animated.Text entering={FadeIn.delay(500).duration(400)} style={styles.subtitle}>
              {subtitleText}
            </Animated.Text>
          )}

          <Animated.View entering={FadeIn.delay(800).duration(400)} style={styles.buttons}>
            <Pressable
              style={[styles.shareButton, { backgroundColor: colors.primary }]}
              onPress={resolvedPrimaryPress}
            >
              <Text style={styles.shareButtonText}>{resolvedPrimaryLabel}</Text>
            </Pressable>
            <Pressable style={styles.doneButton} onPress={onClose}>
              <Text style={[styles.doneButtonText, { color: colors.primary }]}>
                {secondaryButtonLabel}
              </Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  name: {
    fontSize: 52,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#2D1B4E',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    textAlign: 'center',
    marginBottom: 48,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  shareButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  shareButtonText: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#fff',
  },
  doneButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  doneButtonText: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
  },
});
