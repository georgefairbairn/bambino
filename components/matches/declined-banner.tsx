import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

interface DeclinedBannerProps {
  declinerName: string;
  nameName: string;
  message?: string;
  onDismiss: () => void;
}

/**
 * Shown to the PROPOSER when their partner declines a proposed name. Neutral
 * (not alarming) styling, with the partner's optional note and an X to
 * dismiss — dismissing clears the proposal so the name can be proposed again.
 */
export function DeclinedBanner({
  declinerName,
  nameName,
  message,
  onDismiss,
}: DeclinedBannerProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.banner, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
    >
      <View style={styles.content}>
        <Ionicons name="close-circle-outline" size={20} color="#6B5B7B" />
        <View style={styles.textContainer}>
          <Text style={styles.text}>
            {declinerName} declined <Text style={styles.nameText}>{nameName}</Text>
          </Text>
          {message ? <Text style={styles.message}>&ldquo;{message}&rdquo;</Text> : null}
        </View>
        <Pressable
          style={styles.dismiss}
          onPress={onDismiss}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        >
          <Ionicons name="close" size={20} color="#6B5B7B" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textContainer: {
    flex: 1,
  },
  text: {
    fontSize: 15,
    fontFamily: Fonts?.sans,
    color: '#2D1B4E',
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
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
