import { useClerk, useUser } from '@clerk/clerk-expo';
import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VoiceSettingsSection } from '@/components/settings';
import { Fonts } from '@/constants/theme';

export default function Profile() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [isLoading, setIsLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const handleSignOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await signOut();
    } finally {
      setIsLoading(false);
    }
  }, [signOut]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: 32,
        paddingHorizontal: 24,
      }}
    >
      {/* User Info Section */}
      <View style={styles.userInfoSection}>
        {user?.imageUrl ? (
          <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {user?.firstName?.[0] || user?.emailAddresses[0]?.emailAddress[0]?.toUpperCase()}
            </Text>
          </View>
        )}

        <Text style={styles.userName}>{user?.fullName || 'User'}</Text>
        <Text style={styles.userEmail}>{user?.emailAddresses[0]?.emailAddress}</Text>
      </View>

      {/* Settings Section */}
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <VoiceSettingsSection />
      </View>

      {/* Sign Out Button */}
      <Pressable
        style={[styles.signOutButton, isLoading && styles.buttonDisabled]}
        onPress={handleSignOut}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#C6E7F5',
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
    backgroundColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarInitial: {
    fontSize: 30,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#4b5563',
  },
  userName: {
    fontSize: 24,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  userEmail: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    color: '#6b7280',
  },
  settingsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
    color: '#374151',
    marginBottom: 16,
  },
  signOutButton: {
    width: '100%',
    backgroundColor: '#dc2626',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  signOutButtonText: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    fontWeight: '600',
    color: '#ffffff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
