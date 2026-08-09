import { useCallback } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Sentry from '@sentry/react-native';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { Events, trackEvent } from '@/lib/analytics';

interface ShareCodeDisplayProps {
  code: string;
  /** Where this instance is rendered, for PARTNER_CODE_COPIED attribution. */
  source: 'settings' | 'matches_empty' | 'invite_nudge';
  /** Hide the "Your Partner Code" caption when the surrounding copy already says it. */
  showLabel?: boolean;
}

/**
 * The user's 8-character partner code, rendered identically everywhere it
 * appears (Settings, the Matches empty state, the invite nudge) so the three
 * can't drift apart. Tapping copies it.
 *
 * Exists because a share sheet only serves a REMOTE partner. Couples using this
 * app are often in the same room, and that case needs the code readable on
 * screen, not buried inside a share message.
 */
export function ShareCodeDisplay({ code, source, showLabel = true }: ShareCodeDisplayProps) {
  const { colors } = useTheme();

  const handleCopy = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(code);
      trackEvent(Events.PARTNER_CODE_COPIED, { source });
      Alert.alert('Copied', 'Share code copied to clipboard!');
    } catch (err) {
      // Clipboard writes can fail (restricted device profile, sandbox). Don't
      // claim success when nothing landed on the clipboard (#223).
      Sentry.captureException(err, { tags: { flow: 'copy_share_code' } });
      Alert.alert("Couldn't copy", 'Tap and hold the code to copy it manually.');
    }
  }, [code, source]);

  return (
    <View style={styles.container}>
      {showLabel && <Text style={styles.label}>Your Partner Code</Text>}
      <Pressable
        onPress={handleCopy}
        accessibilityRole="button"
        accessibilityLabel={`Your partner code, ${code.split('').join(' ')}. Tap to copy.`}
        style={({ pressed }) => [styles.codeWrap, pressed && styles.codeWrapPressed]}
      >
        <Text style={[styles.code, { color: colors.primary }]} selectable>
          {code}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  codeWrap: {
    overflow: 'hidden',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  codeWrapPressed: {
    opacity: 0.6,
  },
  code: {
    fontSize: 32,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    letterSpacing: 6,
  },
});
