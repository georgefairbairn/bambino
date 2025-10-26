import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { ClerkProvider } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated from 'react-native-reanimated';
import * as WebBrowser from 'expo-web-browser';
import { useFonts } from 'expo-font';
import { Sanchez_400Regular } from '@expo-google-fonts/sanchez';
import { AlfaSlabOne_400Regular } from '@expo-google-fonts/alfa-slab-one';
import { cssInterop } from 'nativewind';
import { Image as ExpoImage } from 'expo-image';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

WebBrowser.maybeCompleteAuthSession();

// Enable Tailwind/NativeWind className on components
cssInterop(ExpoImage, { className: 'style' });
cssInterop(ThemedText as any, { className: 'style' });
cssInterop(ThemedView as any, { className: 'style' });
cssInterop(Animated.Text as any, { className: 'style' });

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const navigationTheme =
    colorScheme === 'dark'
      ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: Colors.dark.background } }
      : {
          ...DefaultTheme,
          colors: { ...DefaultTheme.colors, background: Colors.light.background },
        };

  const [fontsLoaded] = useFonts({
    Sanchez_400Regular,
    AlfaSlabOne_400Regular,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ClerkProvider
      publishableKey={(process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY as string) ?? ''}
      tokenCache={tokenCache}
    >
      <ThemeProvider value={navigationTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </ClerkProvider>
  );
}
