import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useQuery } from 'convex/react';

import { api } from '@/convex/_generated/api';
import { useStoreUser } from '@/hooks/use-store-user';
import { usePushRegistration } from '@/hooks/use-push-registration';
import { useOnboarding } from '@/hooks/use-onboarding';
import { useTheme } from '@/contexts/theme-context';
import { useSkinTone } from '@/contexts/skin-tone-context';
import { useVoiceSettings } from '@/contexts/voice-settings-context';
import { OnboardingScreens } from '@/components/onboarding';
import { LoadingScreen } from '@/components/ui/loading-screen';

export default function TabsLayout() {
  const { isSignedIn } = useAuth();
  // useStoreUser fires createOrUpdateUser; it must stay above the gate since
  // it's what creates the row the gate waits for.
  useStoreUser();
  // Gate the whole tab tree on the Convex user row existing (#167).
  // getCurrentUser returns undefined while loading and null until
  // createOrUpdateUser lands. Until it's a real row, every authenticated
  // query/mutation in (tabs)/* that calls getCurrentUserOrThrow would throw
  // "User not found" — so we hold the loading screen.
  const convexUser = useQuery(api.users.getCurrentUser, isSignedIn ? {} : 'skip');
  const {
    hasCompletedOnboarding,
    isLoading: isOnboardingLoading,
    completeOnboarding,
  } = useOnboarding();
  // AsyncStorage-backed prefs (#177). These hydrate well before the Convex
  // getCurrentUser query, so gating on them here adds ~0ms — it just guarantees
  // no flash of the default skin tone before the first screen renders. (They
  // stay inside the user-keyed providers so they still reset on user switch —
  // #154/#175 — which is why we gate here rather than hoisting them.)
  const { isLoading: isSkinToneLoading } = useSkinTone();
  const { isLoading: isVoiceLoading } = useVoiceSettings();

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  // Wait for the user row to exist before rendering any screen. On a fresh
  // launch the root AuthGate already showed the loading animation; for
  // sign-out + sign-in on the same device this shows the Bambino loading
  // screen instead of a blank gradient.
  if (
    convexUser === undefined ||
    convexUser === null ||
    isOnboardingLoading ||
    isSkinToneLoading ||
    isVoiceLoading
  ) {
    return <LoadingScreen isLoading />;
  }

  // Show onboarding for new users
  if (!hasCompletedOnboarding) {
    return <OnboardingScreens onComplete={completeOnboarding} />;
  }

  // Push registration lives here, below the gate, so the user row is
  // guaranteed to exist — the hook no longer needs its own existence guard.
  return <TabsNavigator />;
}

function TabsNavigator() {
  const { colors, gradients } = useTheme();
  usePushRegistration();

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
          tabBarAccessibilityLabel: 'Explore names',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Shortlist',
          tabBarAccessibilityLabel: 'Shortlist',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'bookmark' : 'bookmark-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          tabBarAccessibilityLabel: 'Partner matches',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Settings',
          tabBarAccessibilityLabel: 'Settings',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
