import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSSO, useSignIn } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [emailAddress, setEmailAddress] = React.useState('');
  const [password, setPassword] = React.useState('');
  const { startSSOFlow } = useSSO();
  const theme = useColorScheme() ?? 'light';

  const onSignInPress = async () => {
    if (!isLoaded) return;
    try {
      const signInAttempt = await signIn.create({ identifier: emailAddress, password });
      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace('/(tabs)');
      } else {
        console.error(JSON.stringify(signInAttempt, null, 2));
      }
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
    }
  };

  const onGooglePress = async () => {
    try {
      const { createdSessionId, setActive } = await startSSOFlow({ strategy: 'oauth_google' });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace('/(tabs)');
      }
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
    }
  };

  return (
    <ThemedView className="flex-1 justify-center gap-4 p-6">
      <ThemedText type="title">Sign in</ThemedText>
      <TextInput
        autoCapitalize="none"
        value={emailAddress}
        placeholder="Email"
        onChangeText={setEmailAddress}
        placeholderTextColor={theme === 'dark' ? '#9BA1A6' : '#687076'}
        className="rounded-lg border border-[#687076] px-3 py-2.5 text-black dark:border-[#9BA1A6]"
      />
      <TextInput
        value={password}
        placeholder="Password"
        secureTextEntry
        onChangeText={setPassword}
        placeholderTextColor={theme === 'dark' ? '#9BA1A6' : '#687076'}
        className="rounded-lg border border-[#687076] px-3 py-2.5 text-black dark:border-[#9BA1A6]"
      />
      <TouchableOpacity
        onPress={onSignInPress}
        className="items-center rounded-lg bg-[#0a7ea4] py-3 dark:bg-white"
      >
        <Text className="font-semibold text-white">Continue</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onGooglePress}
        className="items-center rounded-lg border border-[#687076] py-3 dark:border-[#9BA1A6]"
      >
        <Text className="font-semibold text-black">Continue with Google</Text>
      </TouchableOpacity>
      <View className="flex-row justify-center gap-1.5">
        <Text>Don&apos;t have an account?</Text>
        <Link href={{ pathname: '/(auth)/sign-up' }}>
          <Text>Sign up</Text>
        </Link>
      </View>
    </ThemedView>
  );
}
