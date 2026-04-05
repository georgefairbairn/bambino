import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';

import { useStoreUser } from '@/hooks/use-store-user';
import { useOnboarding } from '@/hooks/use-onboarding';
import { useTheme } from '@/contexts/theme-context';
import { OnboardingScreens } from '@/components/onboarding';
import { GradientBackground } from '@/components/ui/gradient-background';

export default function TabsLayout() {
  const { isSignedIn } = useAuth();
  useStoreUser();
  const {
    hasCompletedOnboarding,
    isLoading: isOnboardingLoading,
    completeOnboarding,
  } = useOnboarding();
  const { colors, gradients } = useTheme();

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  // Wait silently for onboarding check (near-instant from AsyncStorage).
  // The root AuthGate loading screen covers this during initial app launch.
  if (isOnboardingLoading) {
    return <GradientBackground>{null}</GradientBackground>;
  }

  // Show onboarding for new users
  if (!hasCompletedOnboarding) {
    return <OnboardingScreens onComplete={completeOnboarding} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        freezeOnBlur: true,
        sceneStyle: { backgroundColor: gradients.screenBg[0] },
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: '#6B5B7B',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarBackground: () => (
          <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
        ),
        tabBarStyle: {
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(255, 255, 255, 0.85)',
          borderTopWidth: 0,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          position: 'absolute',
          height: 85,
          shadowColor: colors.secondary,
          shadowOpacity: 0.1,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: -4 },
          elevation: 8,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.5)',
        },
      }}
    >
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'compass' : 'compass-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Liked',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'heart' : 'heart-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'heart-circle' : 'heart-circle-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
