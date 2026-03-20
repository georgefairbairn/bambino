import { useClerk, useUser } from '@clerk/clerk-expo';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import * as Sentry from '@sentry/react-native';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View, StyleSheet, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useQuery, useMutation } from 'convex/react';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/convex/_generated/api';
import { usePurchases } from '@/hooks/use-purchases';
import { Paywall } from '@/components/paywall';
import { PartnerLinkModal } from '@/components/partner/partner-link-modal';
import { ThemePickerSection, VoiceSettingsSection } from '@/components/settings';
import { GradientBackground } from '@/components/ui/gradient-background';
import { GradientButton } from '@/components/ui/gradient-button';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

export default function Profile() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { colors } = useTheme();
  const { isPremium, restorePurchases } = usePurchases();
  const deleteAccount = useMutation(api.users.deleteAccount);
  const unlinkPartner = useMutation(api.partners.unlinkPartner);
  const partnerInfo = useQuery(api.partners.getPartnerInfo);
  const [isLoading, setIsLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const insets = useSafeAreaInsets();

  const handleSignOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await signOut();
    } finally {
      setIsLoading(false);
    }
  }, [signOut]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data (selections, matches). This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await deleteAccount();
              await signOut();
            } catch (error) {
              Sentry.captureException(error);
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    );
  }, [deleteAccount, signOut]);

  const handleRestore = useCallback(async () => {
    const success = await restorePurchases();
    if (success) {
      Alert.alert('Restored', 'Your premium purchase has been restored!');
    } else {
      Alert.alert('No Purchase Found', 'No previous purchase was found to restore.');
    }
  }, [restorePurchases]);

  const handleCopyCode = useCallback(async () => {
    if (partnerInfo?.shareCode) {
      await Clipboard.setStringAsync(partnerInfo.shareCode);
      Alert.alert('Copied', 'Share code copied to clipboard!');
    }
  }, [partnerInfo?.shareCode]);

  const handleShareCode = useCallback(async () => {
    if (partnerInfo?.shareCode) {
      try {
        await Share.share({
          message: `Join me on Bambino! Use my partner code: ${partnerInfo.shareCode}`,
        });
      } catch (error) {
        Sentry.captureException(error);
      }
    }
  }, [partnerInfo?.shareCode]);

  const handleUnlinkPartner = useCallback(() => {
    Alert.alert(
      'Unlink Partner',
      'Are you sure you want to unlink your partner? Your selections and existing matches will be kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            try {
              await unlinkPartner();
            } catch (error) {
              Sentry.captureException(error);
              Alert.alert('Error', 'Failed to unlink partner. Please try again.');
            }
          },
        },
      ],
    );
  }, [unlinkPartner]);

  return (
    <GradientBackground>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: 120,
          paddingHorizontal: 24,
        }}
      >
        {/* User Info Section */}
        <Animated.View
          entering={FadeInDown.duration(500).springify()}
          style={styles.userInfoSection}
        >
          {user?.imageUrl ? (
            <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
              <Text style={styles.avatarInitial}>
                {user?.firstName?.[0] || user?.emailAddresses[0]?.emailAddress[0]?.toUpperCase()}
              </Text>
            </View>
          )}

          <Text style={styles.userName}>{user?.fullName || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.emailAddresses[0]?.emailAddress}</Text>
        </Animated.View>

        {/* Subscription Section */}
        <Animated.View
          entering={FadeInUp.delay(100).duration(400).springify()}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Subscription</Text>
          <View style={styles.card}>
            <View style={styles.subscriptionHeader}>
              <Ionicons
                name={isPremium ? 'star' : 'star-outline'}
                size={24}
                color={isPremium ? '#f59e0b' : '#9ca3af'}
              />
              <Text style={styles.subscriptionStatus}>{isPremium ? 'Premium' : 'Free'}</Text>
            </View>
            {!isPremium && (
              <GradientButton
                title="Upgrade to Premium"
                onPress={() => setShowPaywall(true)}
                variant="primary"
              />
            )}
            <Pressable style={styles.restoreButton} onPress={handleRestore}>
              <Text style={styles.restoreButtonText}>Restore Purchase</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Partner Section */}
        <Animated.View
          entering={FadeInUp.delay(150).duration(400).springify()}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Partner</Text>
          <View style={styles.card}>
            {partnerInfo?.partner ? (
              // Has partner
              <View style={styles.partnerInfo}>
                <View style={styles.partnerRow}>
                  {partnerInfo.partner.imageUrl ? (
                    <Image
                      source={{ uri: partnerInfo.partner.imageUrl }}
                      style={styles.partnerAvatar}
                    />
                  ) : (
                    <View
                      style={[styles.partnerAvatarPlaceholder, { backgroundColor: colors.border }]}
                    >
                      <Text style={styles.partnerAvatarInitial}>
                        {partnerInfo.partner.name?.[0]?.toUpperCase() ||
                          partnerInfo.partner.email[0]?.toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.partnerDetails}>
                    <Text style={styles.partnerName}>
                      {partnerInfo.partner.name || partnerInfo.partner.email}
                    </Text>
                    {partnerInfo.partner.name && (
                      <Text style={styles.partnerEmail}>{partnerInfo.partner.email}</Text>
                    )}
                  </View>
                </View>
                <Pressable style={styles.unlinkButton} onPress={handleUnlinkPartner}>
                  <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
                  <Text style={styles.unlinkButtonText}>Unlink Partner</Text>
                </Pressable>
              </View>
            ) : (
              // No partner
              <View style={styles.noPartner}>
                {partnerInfo?.shareCode && (
                  <>
                    <Text style={styles.shareCodeLabel}>Your Share Code</Text>
                    <Text style={[styles.shareCode, { color: colors.primary }]}>
                      {partnerInfo.shareCode}
                    </Text>
                    <View style={styles.shareActions}>
                      <Pressable
                        style={[styles.shareActionButton, { backgroundColor: colors.primaryLight }]}
                        onPress={handleCopyCode}
                      >
                        <Ionicons name="copy-outline" size={18} color={colors.primary} />
                        <Text style={[styles.shareActionText, { color: colors.primary }]}>
                          Copy
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[styles.shareActionButton, { backgroundColor: colors.primaryLight }]}
                        onPress={handleShareCode}
                      >
                        <Ionicons name="share-outline" size={18} color={colors.primary} />
                        <Text style={[styles.shareActionText, { color: colors.primary }]}>
                          Share
                        </Text>
                      </Pressable>
                    </View>
                  </>
                )}
                <GradientButton
                  title="Link Partner"
                  onPress={() => setShowPartnerModal(true)}
                  variant="primary"
                  icon="people"
                />
              </View>
            )}
          </View>
        </Animated.View>

        {/* Settings Section */}
        <Animated.View
          entering={FadeInUp.delay(200).duration(400).springify()}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Settings</Text>
          <ThemePickerSection />
          <View style={{ height: 12 }} />
          <VoiceSettingsSection />
        </Animated.View>

        {/* Legal Section */}
        <Animated.View
          entering={FadeInUp.delay(300).duration(400).springify()}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Legal</Text>
          <Pressable
            style={styles.legalButton}
            onPress={() =>
              WebBrowser.openBrowserAsync(
                'https://bambino-baby.notion.site/325d3b58308281158ce6c6cbdd562734',
              )
            }
          >
            <Ionicons name="shield-checkmark-outline" size={20} color="#6B5B7B" />
            <Text style={styles.legalButtonText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={18} color="#A89BB5" />
          </Pressable>
          <Pressable
            style={styles.legalButton}
            onPress={() =>
              WebBrowser.openBrowserAsync(
                'https://bambino-baby.notion.site/325d3b58308281768597f8bd57581eb7',
              )
            }
          >
            <Ionicons name="document-text-outline" size={20} color="#6B5B7B" />
            <Text style={styles.legalButtonText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={18} color="#A89BB5" />
          </Pressable>
        </Animated.View>

        {/* Sign Out Button */}
        <GradientButton
          title="Sign Out"
          onPress={handleSignOut}
          variant="danger"
          loading={isLoading}
          disabled={isLoading}
        />

        {/* Delete Account */}
        <Pressable
          style={styles.deleteAccountButton}
          onPress={handleDeleteAccount}
          disabled={isLoading}
        >
          <Text style={styles.deleteAccountText}>Delete Account</Text>
        </Pressable>

        <Paywall
          visible={showPaywall}
          onClose={() => setShowPaywall(false)}
          trigger="search_limit"
        />

        <PartnerLinkModal visible={showPartnerModal} onClose={() => setShowPartnerModal(false)} />
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  userInfoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarInitial: {
    fontSize: 30,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#6B5B7B',
  },
  userName: {
    fontSize: 24,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#2D1B4E',
    marginBottom: 8,
  },
  userEmail: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#2D1B4E',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subscriptionStatus: {
    fontSize: 18,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#2D1B4E',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  restoreButtonText: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
  },
  partnerInfo: {
    gap: 16,
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  partnerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  partnerAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerAvatarInitial: {
    fontSize: 18,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#6B5B7B',
  },
  partnerDetails: {
    flex: 1,
  },
  partnerName: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#2D1B4E',
  },
  partnerEmail: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    marginTop: 2,
  },
  unlinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  unlinkButtonText: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#ef4444',
  },
  noPartner: {
    gap: 16,
    alignItems: 'center',
  },
  shareCodeLabel: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
  },
  shareCode: {
    fontSize: 32,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    letterSpacing: 6,
  },
  shareActions: {
    flexDirection: 'row',
    gap: 12,
  },
  shareActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  shareActionText: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
  },
  legalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  legalButtonText: {
    flex: 1,
    fontSize: 16,
    fontFamily: Fonts?.sans,
    color: '#2D1B4E',
  },
  deleteAccountButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  deleteAccountText: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    color: '#A89BB5',
  },
});
