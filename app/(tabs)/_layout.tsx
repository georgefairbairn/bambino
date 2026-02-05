import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';

import { useStoreUser } from '@/hooks/use-store-user';
import { useOnboarding } from '@/hooks/use-onboarding';
import { OnboardingScreens } from '@/components/onboarding';

export default function TabsLayout() {
  const { isSignedIn } = useAuth();
  useStoreUser();
  const {
    hasCompletedOnboarding,
    isLoading: isOnboardingLoading,
    completeOnboarding,
  } = useOnboarding();

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  // Show loading while checking onboarding status
  if (isOnboardingLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#C6E7F5',
        }}
      >
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  // Show onboarding for new users
  if (!hasCompletedOnboarding) {
    return <OnboardingScreens onComplete={completeOnboarding} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0a7ea4',
        tabBarStyle: {
          backgroundColor: '#ffffff',
        },
      }}
    >
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => <Ionicons name="compass" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Liked',
          tabBarIcon: ({ color, size }) => <Ionicons name="heart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
