import { useClerk, useUser } from '@clerk/clerk-expo';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import * as Sentry from '@sentry/react-native';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Events, resetAnalytics, trackEvent, trackScreen } from '@/lib/analytics';
import { decodeConvexError } from '@/lib/convex-errors';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
  Share,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation } from 'convex/react';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/convex/_generated/api';
import { useEffectivePremium } from '@/hooks/use-effective-premium';
import { usePurchases } from '@/hooks/use-purchases';
import { Paywall } from '@/components/paywall';
import { PartnerLinkModal } from '@/components/partner/partner-link-modal';
import { NameConfirmationModal } from '@/components/partner/name-confirmation-modal';
import {
  ThemePickerSection,
  SkinToneSection,
  VoiceSettingsSection,
  FeedbackSection,
} from '@/components/settings';
import { GradientBackground } from '@/components/ui/gradient-background';
import { GradientButton } from '@/components/ui/gradient-button';
import { Fonts } from '@/constants/theme';
import { useOnboarding } from '@/hooks/use-onboarding';
import { useTheme } from '@/contexts/theme-context';
import { useProfilePhoto } from '@/hooks/use-profile-photo';

function formatTimeRemaining(endsAt: number): string {
  const remaining = Math.max(0, endsAt - Date.now());
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return 'soon';
}

function PremiumBanner({
  colors,
  gradients,
  onPress,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  gradients: ReturnType<typeof useTheme>['gradients'];
  onPress: () => void;
}) {
  return (
    <View style={styles.premiumBannerWrap}>
      <LinearGradient
        colors={[colors.primaryLight, colors.secondaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.premiumBannerGradient, { borderColor: `${colors.primary}40` }]}
      >
        <Pressable onPress={onPress} style={styles.premiumBannerContent}>
          <View style={[styles.premiumIconWrap, { backgroundColor: colors.primary }]}>
            <Ionicons name="star" size={18} color="#fff" />
          </View>
          <View style={styles.premiumTextWrap}>
            <Text style={styles.premiumTitle}>Go Premium</Text>
            <Text style={styles.premiumDesc}>Unlimited likes & partner linking</Text>
          </View>
          <LinearGradient
            colors={gradients.buttonPrimary as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.premiumUpgradeBtn}
          >
            <Text style={styles.premiumUpgradeText}>Upgrade</Text>
          </LinearGradient>
        </Pressable>
      </LinearGradient>
    </View>
  );
}

export default function Profile() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { colors, gradients } = useTheme();
  const {
    isPremium,
    isOwnPremium,
    isPartnerPremium,
    partnerName: premiumPartnerName,
    gracePeriodEndsAt,
  } = useEffectivePremium();
  const { restorePurchases } = usePurchases();
  const deleteAccount = useMutation(api.users.deleteAccount);
  const clearPushToken = useMutation(api.users.clearPushToken);
  const unlinkPartner = useMutation(api.partners.unlinkPartner);
  const regenerateShareCode = useMutation(api.partners.regenerateShareCode);
  const partnerInfo = useQuery(api.partners.getPartnerInfo);
  const convexUser = useQuery(api.users.getCurrentUser);
  const [isLoading, setIsLoading] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [showNameConfirmation, setShowNameConfirmation] = useState(false);
  const [showEditName, setShowEditName] = useState(false);
  const [isRegeneratingCode, setIsRegeneratingCode] = useState(false);
  const [pendingAction, setPendingAction] = useState<'copy' | 'share' | 'link' | null>(null);
  const { isUploading, pickAndUploadImage, removePhoto: handleRemovePhoto } = useProfilePhoto(user);
  const { resetOnboarding } = useOnboarding();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      trackScreen('Profile');
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );

  const handleSignOut = useCallback(async () => {
    setIsLoading(true);
    try {
      trackEvent(Events.SIGNED_OUT);
      // Drop the device's push token from this user's row so a subsequent
      // user on the same device doesn't get the previous user's
      // notifications (#172). Best-effort — a network failure here
      // shouldn't block sign-out.
      try {
        await clearPushToken();
      } catch (err) {
        Sentry.captureException(err, { tags: { phase: 'clear_push_token' } });
      }
      // Clear cosmetic per-user preferences from AsyncStorage so a different
      // user signing in on the same device doesn't inherit them (#154).
      // Onboarding state is stored on the Convex user row (not here) so it
      // follows the user across devices and survives sign-out/sign-in on
      // the same device.
      await AsyncStorage.multiRemove([
        'bambino_candy_theme',
        'bambino_voice_settings',
        'bambino_skin_tone',
      ]);
      await signOut();
      Sentry.setUser(null);
      resetAnalytics();
    } catch (err) {
      // #224: spinner stops in finally, but the user needs feedback
      // when signOut itself rejects (e.g. network failure revoking the
      // Clerk session) — they're silently still signed in otherwise.
      Sentry.captureException(err, { tags: { phase: 'sign_out' } });
      Alert.alert('Sign out failed', 'Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [signOut, clearPushToken]);

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
              trackEvent(Events.ACCOUNT_DELETED);
              try {
                await user?.delete();
              } catch (clerkErr) {
                Sentry.captureException(clerkErr, { tags: { phase: 'clerk_delete' } });
              }
              await signOut();
              Sentry.setUser(null);
              resetAnalytics();
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
  }, [deleteAccount, signOut, user]);

  const handleCopyCode = useCallback(async () => {
    if (!partnerInfo?.shareCode) return;
    try {
      await Clipboard.setStringAsync(partnerInfo.shareCode);
      trackEvent(Events.PARTNER_CODE_COPIED);
      Alert.alert('Copied', 'Share code copied to clipboard!');
    } catch (err) {
      // Clipboard writes can fail (restricted device profile, sandbox). Don't
      // claim success when nothing landed on the clipboard (#223).
      Sentry.captureException(err, { tags: { flow: 'copy_share_code' } });
      Alert.alert("Couldn't copy", 'Tap and hold the code to copy it manually.');
    }
  }, [partnerInfo?.shareCode]);

  const handleShareCode = useCallback(async () => {
    if (partnerInfo?.shareCode) {
      try {
        await Share.share({
          message: `Join me on Bambino! Use my partner code: ${partnerInfo.shareCode}`,
        });
        trackEvent(Events.PARTNER_CODE_SHARED);
      } catch (error) {
        Sentry.captureException(error);
      }
    }
  }, [partnerInfo?.shareCode]);

  const executePartnerAction = useCallback(
    (action: 'copy' | 'share' | 'link') => {
      switch (action) {
        case 'copy':
          handleCopyCode();
          break;
        case 'share':
          handleShareCode();
          break;
        case 'link':
          setShowPartnerModal(true);
          break;
      }
    },
    [handleCopyCode, handleShareCode],
  );

  const handlePartnerAction = useCallback(
    (action: 'copy' | 'share' | 'link') => {
      if (convexUser?.nameConfirmed !== true) {
        setPendingAction(action);
        setShowNameConfirmation(true);
        return;
      }

      executePartnerAction(action);
    },
    [convexUser?.nameConfirmed, executePartnerAction],
  );

  const handleNameConfirmed = useCallback(() => {
    setShowNameConfirmation(false);
    if (pendingAction) {
      executePartnerAction(pendingAction);
      setPendingAction(null);
    }
  }, [pendingAction, executePartnerAction]);

  const handleAvatarPress = useCallback(() => {
    if (!user) return;

    if (user.hasImage) {
      Alert.alert('Profile Photo', undefined, [
        { text: 'Change Photo', onPress: pickAndUploadImage },
        {
          text: 'Remove Photo',
          style: 'destructive',
          onPress: handleRemovePhoto,
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      pickAndUploadImage();
    }
  }, [user, pickAndUploadImage, handleRemovePhoto]);

  const handleEditName = useCallback(() => {
    if (!user) return;
    setShowEditName(true);
  }, [user]);

  const handleRegenerateCode = useCallback(() => {
    Alert.alert(
      'Generate New Code?',
      'Your current share code will stop working. If you already shared it, you’ll need to send the new one.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            setIsRegeneratingCode(true);
            try {
              await regenerateShareCode();
            } catch (error) {
              Sentry.captureException(error);
              const { message } = decodeConvexError(error, 'Could not generate a new code.');
              Alert.alert("Couldn't generate a code", message);
            } finally {
              setIsRegeneratingCode(false);
            }
          },
        },
      ],
    );
  }, [regenerateShareCode]);

  const handleUnlinkPartner = useCallback(() => {
    Alert.alert(
      'Unlink Partner',
      'Are you sure you want to unlink your partner? Your liked names will be kept, but matches between you will be cleared.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            setIsUnlinking(true);
            try {
              await unlinkPartner();
              trackEvent(Events.PARTNER_UNLINKED);
            } catch (error) {
              Sentry.captureException(error);
              const { message } = decodeConvexError(error, 'Could not unlink your partner.');
              Alert.alert("Couldn't unlink", message);
            } finally {
              setIsUnlinking(false);
            }
          },
        },
      ],
    );
  }, [unlinkPartner]);

  return (
    <GradientBackground>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: 120,
          paddingHorizontal: 20,
        }}
      >
        {/* User Info */}
        <Animated.View
          entering={FadeInDown.duration(500).springify()}
          style={styles.userInfoSection}
        >
          <Pressable
            onPress={handleAvatarPress}
            disabled={isUploading}
            accessibilityRole="button"
            accessibilityLabel="Edit profile photo"
            accessibilityState={{ disabled: isUploading }}
          >
            {user?.hasImage ? (
              <View style={[styles.avatarRing, { borderColor: colors.primary }]}>
                <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
                {isUploading && (
                  <View style={styles.avatarUploadingOverlay}>
                    <ActivityIndicator color={colors.primary} size="small" />
                  </View>
                )}
                {!isUploading && (
                  <View style={[styles.avatarEditBadge, { backgroundColor: colors.primary }]}>
                    <Ionicons name="camera" size={12} color="#fff" />
                  </View>
                )}
              </View>
            ) : (
              <LinearGradient
                colors={gradients.buttonPrimary as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarGradient}
              >
                {isUploading ? (
                  <ActivityIndicator color="rgba(255,255,255,0.9)" size="small" />
                ) : (
                  <Ionicons name="camera" size={32} color="rgba(255,255,255,0.9)" />
                )}
              </LinearGradient>
            )}
          </Pressable>

          <Pressable
            onPress={handleEditName}
            style={styles.nameRow}
            accessibilityRole="button"
            accessibilityLabel="Edit name"
          >
            <Text style={styles.userName}>{convexUser?.name || user?.fullName || 'User'}</Text>
            <Ionicons name="pencil" size={16} color="#A89BB5" />
          </Pressable>
          {user?.emailAddresses[0]?.emailAddress ? (
            <Text style={styles.userEmail}>{user.emailAddresses[0].emailAddress}</Text>
          ) : null}
        </Animated.View>

        {/* Premium Upgrade Banner */}
        {!isPremium && (
          <Animated.View
            entering={FadeInUp.delay(100).duration(400).springify()}
            style={styles.premiumSection}
          >
            <PremiumBanner
              colors={colors}
              gradients={gradients}
              onPress={() => setShowPaywall(true)}
            />
            {/* Restore Purchase lives here (account actions), moved out of the
                Matches empty state where it was a discovery mismatch (#227). */}
            <Pressable
              style={styles.restoreButton}
              disabled={isRestoring}
              onPress={async () => {
                setIsRestoring(true);
                try {
                  const success = await restorePurchases();
                  if (success) {
                    Alert.alert('Restored', 'Your premium purchase has been restored!');
                  } else {
                    Alert.alert('No Purchase Found', 'No previous purchase was found to restore.');
                  }
                } finally {
                  setIsRestoring(false);
                }
              }}
            >
              {isRestoring ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.restoreButtonText}>Restore Purchase</Text>
              )}
            </Pressable>
          </Animated.View>
        )}

        {/* Premium Active */}
        {isPremium && (
          <Animated.View
            entering={FadeInUp.delay(100).duration(400).springify()}
            style={styles.premiumSection}
          >
            <View
              style={[
                styles.premiumActiveRow,
                { backgroundColor: gracePeriodEndsAt ? '#FFF3CD' : colors.primaryLight },
              ]}
            >
              <Ionicons
                name={gracePeriodEndsAt ? 'time-outline' : 'star'}
                size={18}
                color={gracePeriodEndsAt ? '#856404' : colors.primary}
              />
              <Text
                style={[
                  styles.premiumActiveText,
                  { color: gracePeriodEndsAt ? '#856404' : colors.primary },
                ]}
              >
                {gracePeriodEndsAt
                  ? `Premium expires in ${formatTimeRemaining(gracePeriodEndsAt)}`
                  : isPartnerPremium && !isOwnPremium
                    ? `Premium via ${premiumPartnerName || 'Partner'}`
                    : 'Premium Active'}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Partner */}
        <Animated.View
          entering={FadeInUp.delay(150).duration(400).springify()}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Partner</Text>
          <View style={styles.card}>
            {partnerInfo?.partner ? (
              <View style={styles.partnerInfo}>
                <View style={styles.partnerRow}>
                  {partnerInfo.partner.imageUrl ? (
                    <Image
                      source={{ uri: partnerInfo.partner.imageUrl }}
                      style={styles.partnerAvatar}
                    />
                  ) : (
                    <View
                      style={[
                        styles.partnerAvatarPlaceholder,
                        { backgroundColor: colors.primaryLight },
                      ]}
                    >
                      <Text style={[styles.partnerAvatarInitial, { color: colors.primary }]}>
                        {partnerInfo.partner.name?.[0]?.toUpperCase() || 'B'}
                      </Text>
                    </View>
                  )}
                  <View style={styles.partnerDetails}>
                    <Text style={styles.partnerName}>
                      {partnerInfo.partner.name || 'Bambino User'}
                    </Text>
                  </View>
                </View>
                <Pressable
                  style={styles.unlinkButton}
                  onPress={handleUnlinkPartner}
                  disabled={isUnlinking}
                >
                  {isUnlinking ? (
                    <ActivityIndicator size="small" color="#ef4444" />
                  ) : (
                    <>
                      <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
                      <Text style={styles.unlinkButtonText}>Unlink Partner</Text>
                    </>
                  )}
                </Pressable>
              </View>
            ) : (
              <View style={styles.noPartner}>
                {partnerInfo?.shareCode && (
                  <>
                    <Text style={styles.shareCodeLabel}>Your Share Code</Text>
                    <View style={styles.shareCodeWrap}>
                      <Text style={[styles.shareCode, { color: colors.primary }]}>
                        {partnerInfo.shareCode}
                      </Text>
                    </View>
                    <View style={styles.shareActions}>
                      <Pressable
                        style={[styles.shareActionButton, { backgroundColor: colors.primaryLight }]}
                        onPress={() => handlePartnerAction('copy')}
                      >
                        <Ionicons name="copy-outline" size={16} color={colors.primary} />
                        <Text style={[styles.shareActionText, { color: colors.primary }]}>
                          Copy
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[styles.shareActionButton, { backgroundColor: colors.primaryLight }]}
                        onPress={() => handlePartnerAction('share')}
                      >
                        <Ionicons name="share-outline" size={16} color={colors.primary} />
                        <Text style={[styles.shareActionText, { color: colors.primary }]}>
                          Share
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.shareActionButton,
                          { backgroundColor: colors.primaryLight },
                          isRegeneratingCode && { opacity: 0.6 },
                        ]}
                        onPress={handleRegenerateCode}
                        disabled={isRegeneratingCode}
                      >
                        {isRegeneratingCode ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <>
                            <Ionicons name="refresh-outline" size={16} color={colors.primary} />
                            <Text style={[styles.shareActionText, { color: colors.primary }]}>
                              New
                            </Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  </>
                )}
                <View style={styles.linkPartnerWrap}>
                  <GradientButton
                    title="Link Partner"
                    onPress={() => handlePartnerAction('link')}
                    variant="primary"
                  />
                </View>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Settings */}
        <Animated.View
          entering={FadeInUp.delay(200).duration(400).springify()}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Settings</Text>
          <ThemePickerSection />
          <SkinToneSection />
          <VoiceSettingsSection />
        </Animated.View>

        {/* Other */}
        <Animated.View
          entering={FadeInUp.delay(250).duration(400).springify()}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Other</Text>
          <View style={styles.settingsCard}>
            <Pressable
              style={styles.settingsCardRow}
              onPress={resetOnboarding}
              accessibilityRole="button"
              accessibilityLabel="How It Works"
            >
              <Ionicons
                name="help-circle-outline"
                size={22}
                color="#6B5B7B"
                style={{ marginRight: 12 }}
              />
              <Text style={styles.settingsCardTitle}>How It Works</Text>
              <Ionicons name="chevron-forward" size={22} color="#A89BB5" />
            </Pressable>
          </View>
          <FeedbackSection />
          <View style={styles.settingsCard}>
            <Pressable
              style={styles.settingsCardRow}
              accessibilityRole="button"
              accessibilityLabel="Privacy Policy"
              onPress={() =>
                WebBrowser.openBrowserAsync(
                  'https://bambino-baby.notion.site/325d3b58308281158ce6c6cbdd562734',
                )
              }
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color="#6B5B7B"
                style={{ marginRight: 12 }}
              />
              <Text style={styles.settingsCardTitle}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={22} color="#A89BB5" />
            </Pressable>
          </View>
          <View style={styles.settingsCard}>
            <Pressable
              style={styles.settingsCardRow}
              accessibilityRole="button"
              accessibilityLabel="Terms of Service"
              onPress={() =>
                WebBrowser.openBrowserAsync(
                  'https://bambino-baby.notion.site/325d3b58308281768597f8bd57581eb7',
                )
              }
            >
              <Ionicons
                name="document-text-outline"
                size={22}
                color="#6B5B7B"
                style={{ marginRight: 12 }}
              />
              <Text style={styles.settingsCardTitle}>Terms of Service</Text>
              <Ionicons name="chevron-forward" size={22} color="#A89BB5" />
            </Pressable>
          </View>
        </Animated.View>

        {/* Sign Out */}
        <Animated.View entering={FadeInUp.delay(300).duration(400).springify()}>
          <GradientButton
            title="Sign Out"
            onPress={handleSignOut}
            variant="danger"
            loading={isLoading}
            disabled={isLoading}
          />
        </Animated.View>

        {/* Delete Account */}
        <Pressable
          style={styles.deleteAccountButton}
          onPress={handleDeleteAccount}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <Text style={styles.deleteAccountText}>Delete Account</Text>
          )}
        </Pressable>

        <Paywall
          visible={showPaywall}
          onClose={() => setShowPaywall(false)}
          trigger="partner_limit"
        />

        <PartnerLinkModal visible={showPartnerModal} onClose={() => setShowPartnerModal(false)} />

        <NameConfirmationModal
          visible={showEditName}
          onClose={() => setShowEditName(false)}
          onConfirmed={() => setShowEditName(false)}
          mode="edit"
        />

        <NameConfirmationModal
          visible={showNameConfirmation}
          onClose={() => {
            setShowNameConfirmation(false);
            setPendingAction(null);
          }}
          onConfirmed={handleNameConfirmed}
        />
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },

  /* User info */
  userInfoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  avatarUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 24,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#2D1B4E',
    marginBottom: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userEmail: {
    fontSize: 15,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
  },

  /* Premium banner */
  premiumSection: {
    marginBottom: 24,
  },
  restoreButton: {
    paddingVertical: 10,
    marginTop: 4,
    alignItems: 'center',
  },
  restoreButtonText: {
    fontSize: 13,
    fontFamily: Fonts?.sans,
    color: '#A89BB5',
  },
  premiumBannerWrap: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  premiumBannerGradient: {
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
  },
  premiumBannerContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  premiumIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumTextWrap: {
    flex: 1,
  },
  premiumTitle: {
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    fontSize: 16,
    color: '#2D1B4E',
  },
  premiumDesc: {
    fontSize: 12,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    marginTop: 2,
  },
  premiumUpgradeBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  premiumUpgradeText: {
    color: '#fff',
    fontFamily: Fonts?.sans,
    fontWeight: '700',
    fontSize: 13,
  },
  premiumActiveRow: {
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  premiumActiveText: {
    fontSize: 15,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
  },
  /* Sections — matches filters.tsx pattern */
  section: {
    gap: 8,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    color: '#2D1B4E',
  },

  /* Card — matches dashboard name card pattern: #fff, 16px radius, padding, shadow */
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  settingsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  settingsCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsCardTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#2D1B4E',
  },

  /* Partner */
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
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
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
    gap: 12,
    alignItems: 'center',
  },
  shareCodeLabel: {
    fontSize: 12,
    fontFamily: Fonts?.sans,
    color: '#6B5B7B',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  shareCode: {
    fontSize: 32,
    fontFamily: Fonts?.title || 'Gabarito_800ExtraBold',
    letterSpacing: 6,
  },
  shareCodeWrap: {
    overflow: 'hidden',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  shareActions: {
    flexDirection: 'row',
    gap: 10,
  },
  shareActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  shareActionText: {
    fontSize: 14,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
  },
  linkPartnerWrap: {
    alignSelf: 'stretch',
  },

  /* Delete account */
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
