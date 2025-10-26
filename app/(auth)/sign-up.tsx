import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSignUp } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const [emailAddress, setEmailAddress] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [pendingVerification, setPendingVerification] = React.useState(false);
  const [code, setCode] = React.useState('');
  const theme = useColorScheme() ?? 'light';

  const onSignUpPress = async () => {
    if (!isLoaded) return;
    try {
      await signUp.create({ emailAddress, password });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded) return;
    try {
      const signUpAttempt = await signUp.attemptEmailAddressVerification({ code });
      if (signUpAttempt.status === 'complete') {
        await setActive({ session: signUpAttempt.createdSessionId });
        router.replace('/(tabs)');
      }
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
    }
  };

  return (
    <ThemedView className="flex-1 justify-center gap-4 p-6">
      {pendingVerification ? (
        <>
          <ThemedText type="title">Enter verification code</ThemedText>
          <TextInput
            value={code}
            placeholder="Code"
            onChangeText={setCode}
            placeholderTextColor={theme === 'dark' ? '#9BA1A6' : '#687076'}
            className="rounded-lg border border-[#687076] px-3 py-2.5 text-black dark:border-[#9BA1A6]"
          />
          <TouchableOpacity
            onPress={onVerifyPress}
            className="items-center rounded-lg bg-[#0a7ea4] py-3 dark:bg-white"
          >
            <Text className="font-semibold text-white">Verify</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <ThemedText type="title">Sign up</ThemedText>
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
            onPress={onSignUpPress}
            className="items-center rounded-lg bg-[#0a7ea4] py-3 dark:bg-white"
          >
            <Text className="font-semibold text-white">Continue</Text>
          </TouchableOpacity>
          <View className="flex-row justify-center gap-1.5">
            <Text>Already have an account?</Text>
            <Link href={{ pathname: '/(auth)/sign-in' }}>
              <Text>Sign in</Text>
            </Link>
          </View>
        </>
      )}
    </ThemedView>
  );
}
