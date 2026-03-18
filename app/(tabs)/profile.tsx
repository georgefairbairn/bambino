import { useClerk, useUser } from '@clerk/clerk-expo';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import * as Sentry from '@sentry/react-native';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useMutation } from 'convex/react';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/convex/_generated/api';
import { usePurchases } from '@/hooks/use-purchases';
import { Paywall } from '@/components/paywall';
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
  const [isLoading, setIsLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
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
      'This will permanently delete your account and all associated data (searches, matches, selections). This cannot be undone.',
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
          style={styles.subscriptionSection}
        >
          <Text style={styles.sectionTitle}>Subscription</Text>
          <View style={styles.subscriptionCard}>
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

        {/* Settings Section */}
        <Animated.View
          entering={FadeInUp.delay(200).duration(400).springify()}
          style={styles.settingsSection}
        >
          <Text style={styles.sectionTitle}>Settings</Text>
          <ThemePickerSection />
          <View style={{ height: 12 }} />
          <VoiceSettingsSection />
        </Animated.View>

        {/* Legal Section */}
        <Animated.View
          entering={FadeInUp.delay(300).duration(400).springify()}
          style={styles.legalSection}
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
  subscriptionSection: {
    marginBottom: 32,
  },
  subscriptionCard: {
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
  settingsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#2D1B4E',
    marginBottom: 16,
  },
  legalSection: {
    marginBottom: 32,
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
  buttonDisabled: {
    opacity: 0.6,
  },
});
