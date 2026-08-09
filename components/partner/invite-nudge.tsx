import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { AnimatedBottomSheet } from '@/components/ui/animated-bottom-sheet';
import { GradientButton } from '@/components/ui/gradient-button';
import { BUTTON_TEXT, Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { buildInviteMessage } from '@/constants/links';
import { Events, trackEvent } from '@/lib/analytics';

const LIKES_BEFORE_NUDGE = 10;

interface InviteNudgeProps {
  /** Hold the nudge back this session — e.g. while the filter nudge is on screen. */
  suppressed?: boolean;
}

/**
 * One-time partner-invite nudge. Slides up over the swipe screen once an
 * unpartnered user has liked {@link LIKES_BEFORE_NUDGE} names — the point where
 * they've shown intent but have nothing to match against.
 *
 * "Once" is enforced on the user row (`inviteNudgeShown`), not local state, so
 * it survives reinstalls and doesn't reappear on a second device. Both the
 * share path and the dismiss path mark it shown, so it never returns either way.
 */
export function InviteNudge({ suppressed = false }: InviteNudgeProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const latchedRef = useRef(false);

  const partnerInfo = useQuery(api.partners.getPartnerInfo);
  const stats = useQuery(api.selections.getSelectionStats);
  const markShown = useMutation(api.users.markInviteNudgeShown);

  const likedCount = stats?.liked ?? 0;

  // partnerInfo is `null` for a signed-in user whose row hasn't synced yet, and
  // `undefined` while loading — neither is eligible.
  const eligible =
    !suppressed &&
    partnerInfo != null &&
    !partnerInfo.partner &&
    partnerInfo.inviteNudgeShown !== true &&
    !!partnerInfo.shareCode &&
    likedCount >= LIKES_BEFORE_NUDGE;

  // Open once, then latch. Visibility deliberately does NOT track `eligible`:
  // markShown() below sets inviteNudgeShown, which makes `eligible` false on the
  // next query round-trip — driving the sheet off that would snap it shut a
  // frame after it opened. `open` is owned by the user from here on.
  useEffect(() => {
    if (!eligible || latchedRef.current) return;
    latchedRef.current = true;
    setOpen(true);
    trackEvent(Events.INVITE_NUDGE_SHOWN, { liked_count: likedCount });
    // Persist immediately rather than on dismiss, so force-quitting the app
    // while it's on screen doesn't bring it back.
    void markShown();
  }, [eligible, likedCount, markShown]);

  const close = () => setOpen(false);

  const handleDismiss = () => {
    trackEvent(Events.INVITE_NUDGE_DISMISSED);
    close();
  };

  const handleShare = async () => {
    if (!partnerInfo?.shareCode) return;
    setIsSharing(true);
    try {
      await Share.share({ message: buildInviteMessage(partnerInfo.shareCode) });
      trackEvent(Events.PARTNER_CODE_SHARED, { source: 'invite_nudge' });
    } catch (error) {
      Sentry.captureException(error);
    } finally {
      setIsSharing(false);
      close();
    }
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
          You&apos;ve liked {likedCount} names. Invite your partner to start matching — the names
          you both like show up together.
        </Text>
      </View>

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
