import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

interface DeclinedNoteBannerProps {
  declinerName: string;
  nameName: string;
  message: string;
  onDismiss: () => void;
}

// Shown to the proposer when their most recent proposal was declined with a
// note. Informational only (no actions) — the X dismisses the banner without
// touching the card's Rejected tag or the detail-sheet note, both of which
// persist until the name is re-proposed. See convex/matches.ts
// getLatestDeclinedProposal / dismissDeclinedNote.
export function DeclinedNoteBanner({
  declinerName,
  nameName,
  message,
  onDismiss,
}: DeclinedNoteBannerProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.banner, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
    >
      <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
      <View style={styles.textContainer}>
        <Text style={[styles.text, { color: colors.tabActive }]}>
          {declinerName} declined <Text style={styles.nameText}>{nameName}</Text>
        </Text>
        <Text style={styles.message}>&ldquo;{message}&rdquo;</Text>
      </View>
      <Pressable
        style={styles.dismiss}
        onPress={onDismiss}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Dismiss decline note"
      >
        <Ionicons name="close-circle" size={24} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
  },
  textContainer: {
    flex: 1,
  },
  text: {
    fontSize: 15,
    fontFamily: Fonts?.sans,
    lineHeight: 22,
  },
  nameText: {
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
  },
  message: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    fontStyle: 'italic',
    marginTop: 4,
  },
  dismiss: {
    padding: 4,
  },
});
