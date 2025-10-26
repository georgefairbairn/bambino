import React from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useAuth, useUser } from '@clerk/clerk-expo';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const { signOut } = useAuth();
  const { user } = useUser();

  const name = user?.firstName || user?.fullName || 'there';

  return (
    <ThemedView className="flex-1 justify-between gap-4 p-4">
      <View className="mt-3 items-center gap-3">
        {user?.imageUrl ? (
          <Image
            source={{ uri: user.imageUrl }}
            className="h-24 w-24 rounded-full border-2 border-black/10"
          />
        ) : null}
        <ThemedText type="title" style={{ fontFamily: Fonts.rounded }}>
          {`Hello ${name}! 👋`}
        </ThemedText>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={async () => {
          await signOut();
          router.replace('/(auth)/sign-in');
        }}
        className="items-center rounded-xl bg-[#0a7ea4] px-4 py-3.5 dark:bg-white"
      >
        <ThemedText className="text-white" style={{ fontFamily: Fonts.sans, fontSize: 16 }}>
          Sign out
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}
