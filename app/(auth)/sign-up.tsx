import { useSignUp, useSSO } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export default function SignUp() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const { startSSOFlow } = useSSO();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignUp = useCallback(async () => {
    if (!isLoaded) return;

    setIsLoading(true);
    setError('');

    try {
      await signUp.create({
        emailAddress: email,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err: unknown) {
      const clerkError = err as { errors?: { message: string }[] };
      setError(clerkError.errors?.[0]?.message || 'Sign up failed');
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, signUp, email, password]);

  const handleVerification = useCallback(async () => {
    if (!isLoaded) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/');
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: { message: string }[] };
      setError(clerkError.errors?.[0]?.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, signUp, code, setActive, router]);

  const handleGoogleSignUp = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const { createdSessionId, setActive: ssoSetActive } = await startSSOFlow({
        strategy: 'oauth_google',
      });

      if (createdSessionId && ssoSetActive) {
        await ssoSetActive({ session: createdSessionId });
        router.replace('/');
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: { message: string }[] };
      setError(clerkError.errors?.[0]?.message || 'Google sign up failed');
    } finally {
      setIsLoading(false);
    }
  }, [startSSOFlow, router]);

  if (pendingVerification) {
    return (
      <View className="flex-1 justify-center px-8">
        <Text className="mb-4 text-center text-3xl font-bold">Verify Email</Text>
        <Text className="mb-8 text-center text-gray-600">
          We sent a verification code to {email}
        </Text>

        {error ? <Text className="mb-4 text-center text-red-600">{error}</Text> : null}

        <TextInput
          className="mb-6 rounded-lg bg-white p-4 text-center text-2xl tracking-widest"
          placeholder="000000"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
        />

        <Pressable
          className="rounded-lg bg-blue-600 p-4"
          onPress={handleVerification}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-center font-semibold text-white">Verify Email</Text>
          )}
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center px-8">
      <Text className="mb-8 text-center text-3xl font-bold">Create Account</Text>

      {error ? <Text className="mb-4 text-center text-red-600">{error}</Text> : null}

      <TextInput
        className="mb-4 rounded-lg bg-white p-4"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        className="mb-6 rounded-lg bg-white p-4"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Pressable
        className="mb-4 rounded-lg bg-blue-600 p-4"
        onPress={handleSignUp}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-center font-semibold text-white">Sign Up</Text>
        )}
      </Pressable>

      <View className="mb-6 flex-row items-center">
        <View className="h-px flex-1 bg-gray-300" />
        <Text className="mx-4 text-gray-500">or</Text>
        <View className="h-px flex-1 bg-gray-300" />
      </View>

      <Pressable
        className="mb-6 flex-row items-center justify-center rounded-lg bg-white p-4"
        onPress={handleGoogleSignUp}
        disabled={isLoading}
      >
        <Ionicons name="logo-google" size={20} color="#4285F4" />
        <Text className="ml-2 font-semibold">Continue with Google</Text>
      </Pressable>

      <View className="flex-row justify-center">
        <Text className="text-gray-600">Already have an account? </Text>
        <Link href="/(auth)/sign-in" asChild>
          <Pressable>
            <Text className="font-semibold text-blue-600">Sign In</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
