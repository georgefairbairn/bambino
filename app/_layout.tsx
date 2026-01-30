import '@/global.css';

import { ClerkLoaded, ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { AlfaSlabOne_400Regular } from '@expo-google-fonts/alfa-slab-one';
import { Sanchez_400Regular } from '@expo-google-fonts/sanchez';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexReactClient } from 'convex/react';
import { useFonts } from 'expo-font';
import { Image as ExpoImage } from 'expo-image';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Animated } from 'react-native';
import { cssInterop } from 'react-native-css-interop';

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
    Sanchez_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <Slot />
        </ConvexProviderWithClerk>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
