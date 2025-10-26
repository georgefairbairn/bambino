import { Tabs, Redirect, router } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SignedIn, SignedOut, useUser } from '@clerk/clerk-expo';
import { Text, Pressable } from 'react-native';
import { Image } from 'expo-image';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user } = useUser();

  return (
    <>
      <SignedIn>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
            headerShown: true,
            headerTitle: () => (
              <Text className="text-4xl text-black" style={{ fontFamily: Fonts.display }}>
                bambino
              </Text>
            ),
            headerTitleAlign: 'center',
            headerStyle: {
              backgroundColor: Colors[colorScheme ?? 'light'].background,
            },
            headerRight: () => (
              <Pressable
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => router.push('/profile')}
                style={{ marginRight: 8 }}
              >
                {user?.imageUrl ? (
                  <Image
                    source={{ uri: user.imageUrl }}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 9999,
                      borderWidth: 1,
                      borderColor: (colorScheme ?? 'light') === 'dark' ? '#9BA1A6' : '#687076',
                    }}
                  />
                ) : (
                  <IconSymbol
                    size={28}
                    name="person.circle"
                    color={Colors[colorScheme ?? 'light'].icon}
                  />
                )}
              </Pressable>
            ),
            tabBarButton: HapticTab,
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Home',
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
            }}
          />
          <Tabs.Screen
            name="explore"
            options={{
              title: 'Explore',
              tabBarIcon: ({ color }) => (
                <IconSymbol size={28} name="paperplane.fill" color={color} />
              ),
            }}
          />
        </Tabs>
      </SignedIn>
      <SignedOut>
        <Redirect href={{ pathname: '/(auth)/sign-in' }} />
      </SignedOut>
    </>
  );
}
