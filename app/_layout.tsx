import '@/global.css';

import { ClerkLoaded, ClerkProvider } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { AlfaSlabOne_400Regular } from '@expo-google-fonts/alfa-slab-one';
import { Sanchez_400Regular } from '@expo-google-fonts/sanchez';
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

if (!publishableKey) {
  throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Please set it in your .env file.');
}

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
        <Slot />
      </ClerkLoaded>
    </ClerkProvider>
  );
}
