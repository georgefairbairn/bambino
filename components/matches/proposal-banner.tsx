import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

interface ProposalBannerProps {
  proposerName: string;
  nameName: string;
  message?: string;
  isCurrentUserProposer: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onWithdraw: () => void;
}

export function ProposalBanner({
  proposerName,
  nameName,
  message,
  isCurrentUserProposer,
  onAccept,
  onDecline,
  onWithdraw,
}: ProposalBannerProps) {
  const { colors } = useTheme();

  if (isCurrentUserProposer) {
    return (
      <View
        style={[
          styles.banner,
          { backgroundColor: colors.secondaryLight, borderColor: colors.secondary },
        ]}
      >
        <View style={styles.bannerContent}>
          <Ionicons name="time-outline" size={20} color={colors.primary} />
          <View style={styles.bannerTextContainer}>
            <Text style={[styles.bannerText, { color: colors.tabActive }]}>
              Waiting for response on{' '}
              <Text style={styles.bannerNameText}>{nameName}</Text>
            </Text>
          </View>
          <Pressable style={styles.withdrawClose} onPress={onWithdraw} hitSlop={10}>
            <Ionicons name="close-circle" size={24} color={colors.primary} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: colors.primaryLight, borderColor: colors.primary },
      ]}
    >
      <View style={styles.bannerContent}>
        <Ionicons name="hand-left" size={20} color={colors.primary} />
        <View style={styles.bannerTextContainer}>
          <Text style={[styles.bannerText, { color: colors.tabActive }]}>
            {proposerName} proposed{' '}
            <Text style={styles.bannerNameText}>{nameName}</Text>
          </Text>
          {message ? (
            <Text style={styles.bannerMessage}>"{message}"</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.bannerActions}>
        <Pressable
          style={[styles.acceptButton, { backgroundColor: colors.primary }]}
          onPress={onAccept}
        >
          <Text style={styles.acceptButtonText}>Accept</Text>
        </Pressable>
        <Pressable style={styles.declineButton} onPress={onDecline}>
          <Text style={[styles.declineButtonText, { color: '#A89BB5' }]}>Decline</Text>
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
    gap: 12,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerText: {
    fontSize: 15,
    fontFamily: Fonts?.sans,
    lineHeight: 22,
  },
  bannerNameText: {
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
  },
  bannerMessage: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    fontStyle: 'italic',
    marginTop: 4,
  },
  bannerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  acceptButtonText: {
    fontSize: 15,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#fff',
  },
  declineButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  declineButtonText: {
    fontSize: 15,
    fontFamily: Fonts?.sans,
    fontWeight: '500',
  },
  withdrawClose: {
    padding: 4,
  },
});
