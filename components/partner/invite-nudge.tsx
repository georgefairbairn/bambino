import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { AnimatedBottomSheet } from '@/components/ui/animated-bottom-sheet';
import { GradientButton } from '@/components/ui/gradient-button';
import { BUTTON_TEXT, Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { usePushPrimingPrompt } from '@/contexts/push-priming-context';
import { ShareCodeDisplay } from '@/components/partner/share-code-display';
import { Events, trackEvent } from '@/lib/analytics';
import { shareInvite } from '@/lib/share-invite';

interface InviteNudgeProps {
  /** Hold the nudge back this session — e.g. while the filter nudge is on screen. */
  suppressed?: boolean;
}

/**
 * Partner-invite nudge. Slides up over the swipe screen when the server says
 * it's due (`inviteNudgeDue`): after 20 swipes, then once more 100 swipes
 * later. The schedule lives on the user row (convex/inviteNudge.ts), so it
 * survives reinstalls and doesn't repeat on a second device.
 */
export function InviteNudge({ suppressed = false }: InviteNudgeProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const latchedRef = useRef(false);

  const partnerInfo = useQuery(api.partners.getPartnerInfo);
  const promptForPush = usePushPrimingPrompt();
  const stats = useQuery(api.selections.getSelectionStats);
  const markShown = useMutation(api.users.markInviteNudgeShown);

  const likedCount = stats?.liked ?? 0;

  // partnerInfo is `null` for a signed-in user whose row hasn't synced yet, and
  // `undefined` while loading — neither is eligible.
  const eligible =
    !suppressed &&
    partnerInfo != null &&
    !partnerInfo.partner &&
    partnerInfo.inviteNudgeDue &&
    !!partnerInfo.shareCode;

  // Open on each showing, then latch. Visibility deliberately does NOT track
  // `eligible`: markShown() below makes the nudge not due on the next query
  // round-trip, and driving the sheet off that would snap it shut a frame after
  // it opened. `open` is owned by the user from here on. The latch resets once
  // the server agrees the showing is recorded, ready for the next one.
  useEffect(() => {
    if (!eligible) {
      if (partnerInfo != null && !partnerInfo.inviteNudgeDue) latchedRef.current = false;
      return;
    }
    if (latchedRef.current) return;
    latchedRef.current = true;
    setOpen(true);
    trackEvent(Events.INVITE_NUDGE_SHOWN, { liked_count: likedCount });
    // Persist immediately rather than on dismiss, so force-quitting the app
    // while it's on screen doesn't bring it back.
    void markShown();
  }, [eligible, partnerInfo, likedCount, markShown]);

  const close = () => setOpen(false);

  const handleDismiss = () => {
    trackEvent(Events.INVITE_NUDGE_DISMISSED);
    close();
  };

  const handleShare = async () => {
    if (!partnerInfo?.shareCode) return;
    setIsSharing(true);
    let shared = false;
    try {
      shared = await shareInvite(partnerInfo.shareCode, 'invite_nudge');
    } catch (error) {
      Sentry.captureException(error);
    } finally {
      setIsSharing(false);
      close();
    }
    // After close(): the provider waits for this sheet to animate out.
    if (shared) await promptForPush('invite');
  };

  return (
    <AnimatedBottomSheet
      visible={open}
      onClose={close}
      style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}
    >
      <View style={styles.header}>
        <Text style={styles.headline}>Invite your partner</Text>
        <Text style={styles.subcopy}>
          {likedCount >= 2 ? `You've liked ${likedCount} names. ` : ''}Invite your partner to start
          matching. The names you both like show up together.
        </Text>
      </View>

      {partnerInfo?.shareCode && (
        <View style={styles.codeWrap}>
          <ShareCodeDisplay code={partnerInfo.shareCode} source="invite_nudge" />
        </View>
      )}

      <View style={styles.buttonWrap}>
        {isSharing ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <GradientButton title="Share Your Code" onPress={handleShare} />
        )}
      </View>

      <Pressable
        style={styles.dismissButton}
        onPress={handleDismiss}
        accessibilityRole="button"
        accessibilityLabel="Not now"
      >
        <Text style={[styles.dismissText, { color: colors.primary }]}>Not now</Text>
      </Pressable>
    </AnimatedBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headline: {
    fontSize: 24,
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
  codeWrap: {
    marginBottom: 20,
  },
  buttonWrap: {
    marginBottom: 8,
    minHeight: 52,
    justifyContent: 'center',
  },
  dismissButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dismissText: {
    ...BUTTON_TEXT.link,
  },
});
