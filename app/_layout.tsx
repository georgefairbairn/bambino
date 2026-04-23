import '@/global.css';

import * as Sentry from '@sentry/react-native';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { AlfaSlabOne_400Regular } from '@expo-google-fonts/alfa-slab-one';
import {
  Gabarito_700Bold,
  Gabarito_800ExtraBold,
  Gabarito_900Black,
} from '@expo-google-fonts/gabarito';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexReactClient } from 'convex/react';
import { useFonts } from 'expo-font';
import { Image as ExpoImage } from 'expo-image';
import { Slot } from 'expo-router';
import Constants from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Animated } from 'react-native';
import { cssInterop } from 'react-native-css-interop';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from '@/contexts/theme-context';
import { VoiceSettingsProvider } from '@/contexts/voice-settings-context';
import { SkinToneProvider } from '@/contexts/skin-tone-context';
import { OnboardingProvider } from '@/contexts/onboarding-context';
import { ErrorBoundary } from '@/components/error-boundary';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { OfflineBanner } from '@/components/ui/offline-banner';
import { initAnalytics } from '@/lib/analytics';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: !__DEV__,
  release: Constants.expoConfig?.version ?? '1.0.0',
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: 0.2,
});

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Register cssInterop for components that need className support
cssInterop(ExpoImage, { className: 'style' });
cssInterop(Animated.Text, { className: 'style' });
cssInterop(Animated.View, { className: 'style' });

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL!;

if (!publishableKey) {
  throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Please set it in your .env file.');
}

if (!convexUrl) {
  throw new Error('Missing EXPO_PUBLIC_CONVEX_URL. Please set it in your .env file.');
}

const convex = new ConvexReactClient(convexUrl);

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    AlfaSlabOne_400Regular,
    Gabarito_700Bold,
    Gabarito_800ExtraBold,
    Gabarito_900Black,
  });

  useEffect(() => {
    initAnalytics();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <ThemeProvider>
          <ErrorBoundary>
            <AuthGate>
              <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
                <SkinToneProvider>
                  <VoiceSettingsProvider>
                    <OnboardingProvider>
                      <OfflineBanner />
                      <Slot />
                    </OnboardingProvider>
                  </VoiceSettingsProvider>
                </SkinToneProvider>
              </ConvexProviderWithClerk>
            </AuthGate>
          </ErrorBoundary>
        </ThemeProvider>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded } = useAuth();
  const { isLoading: themeLoading } = useTheme();
  const [animationDone, setAnimationDone] = useState(false);

  // Keep splash screen visible until theme loads from AsyncStorage
  useEffect(() => {
    if (!themeLoading) {
      SplashScreen.hideAsync();
    }
  }, [themeLoading]);

  if (themeLoading) return null;

  // Always show at least one full animation cycle on app launch
  if (!animationDone) {
    return <LoadingScreen isLoading={!isLoaded} onFinished={() => setAnimationDone(true)} />;
  }

  return <>{children}</>;
}
