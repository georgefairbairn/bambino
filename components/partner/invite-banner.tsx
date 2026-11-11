import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  type SharedValue,
  interpolate,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';
import { BUTTON_TEXT, Fonts } from '@/constants/theme';
import { CARD_WIDTH } from '@/constants/swipe';
import { useTheme } from '@/contexts/theme-context';
import { usePushPrimingPrompt } from '@/contexts/push-priming-context';
import { useA11yPreferences } from '@/hooks/use-a11y-preferences';
import { Events, trackEvent } from '@/lib/analytics';
import { shareInvite } from '@/lib/share-invite';

/** The row's height plus its gap to the card; the card gives up exactly this. */
export const INVITE_BANNER_HEIGHT = 52;

interface InviteBannerProps {
  expanded: boolean;
  shareCode: string;
  liked: number;
  /**
   * Driven here, read by the swipe cards: they shrink by this much while the
   * row is open and grow back as it collapses, so nothing overlaps.
   */
  height: SharedValue<number>;
}

/**
 * Partner-invite row above the swipe stack for unpartnered users. Opens each
 * time Explore comes into focus and collapses once they start swiping, giving
 * the card its space back. Unlike the nudge sheet it never retires, so solo
 * swipers always pass one way to invite on their way in.
 */
export function InviteBanner({ expanded, shareCode, liked, height }: InviteBannerProps) {
  const { colors } = useTheme();
  const { reduceMotion } = useA11yPreferences();
  const promptForPush = usePushPrimingPrompt();

  useEffect(() => {
    const target = expanded ? INVITE_BANNER_HEIGHT : 0;
    height.value = reduceMotion ? target : withTiming(target, { duration: 250 });
    if (expanded) trackEvent(Events.INVITE_BANNER_SHOWN, { liked_count: liked });
    // liked is only reported, not a reason to re-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, reduceMotion, height]);

  const containerStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: interpolate(height.value, [0, INVITE_BANNER_HEIGHT], [0, 1]),
  }));

  const handleInvite = async () => {
    try {
      if (await shareInvite(shareCode, 'explore_banner')) await promptForPush('invite');
    } catch (error) {
      Sentry.captureException(error);
    }
  };

  const message =
    liked >= 2 ? `${liked} liked names waiting for your partner` : 'Matching takes two';

  return (
    <Animated.View
      style={[styles.container, containerStyle]}
      pointerEvents={expanded ? 'auto' : 'none'}
      accessibilityElementsHidden={!expanded}
      importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
    >
      <View style={[styles.row, { shadowColor: colors.secondary }]}>
        <Ionicons name="people-outline" size={18} color={colors.tabActive} />
        <Text style={styles.message} numberOfLines={1}>
          {message}
        </Text>
        <Pressable
          style={[styles.inviteButton, { backgroundColor: colors.primary }]}
          onPress={handleInvite}
          accessibilityRole="button"
          accessibilityLabel="Invite your partner"
          hitSlop={8}
        >
          <Text style={styles.inviteText}>Invite</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    overflow: 'hidden',
    // Room for the row's shadow inside the clip.
    paddingTop: 2,
  },
  row: {
    width: CARD_WIDTH,
    height: INVITE_BANNER_HEIGHT - 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingLeft: 14,
    paddingRight: 6,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#2D1B4E',
  },
  inviteButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  inviteText: {
    ...BUTTON_TEXT.pill,
    color: '#fff',
  },
});
