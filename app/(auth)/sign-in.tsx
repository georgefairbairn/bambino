import { useSignIn, useSSO } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { GradientBackground } from '@/components/ui/gradient-background';
import { GradientButton } from '@/components/ui/gradient-button';
import { StyledInput } from '@/components/ui/styled-input';

WebBrowser.maybeCompleteAuthSession();

export default function SignIn() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = useCallback(async () => {
    if (!isLoaded) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/');
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: { message: string }[] };
      setError(clerkError.errors?.[0]?.message || 'Sign in failed');
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, signIn, email, password, setActive, router]);

  const handleGoogleSignIn = useCallback(async () => {
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
      setError(clerkError.errors?.[0]?.message || 'Google sign in failed');
    } finally {
      setIsLoading(false);
    }
  }, [startSSOFlow, router]);

  return (
    <GradientBackground variant="auth">
      <View className="flex-1 justify-center px-8">
        <Animated.Text
          entering={FadeInDown.duration(500).springify()}
          className="mb-8 text-center text-3xl font-bold"
        >
          Welcome Back
        </Animated.Text>

        {error ? <Text className="mb-4 text-center text-red-600">{error}</Text> : null}

        <Animated.View entering={FadeInUp.delay(100).duration(400).springify()}>
          <StyledInput
            className="mb-4"
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).duration(400).springify()}>
          <StyledInput
            className="mb-6"
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(300).duration(400).springify()} className="mb-4">
          <GradientButton
            title="Sign In"
            onPress={handleSignIn}
            variant="primary"
            loading={isLoading}
            disabled={isLoading}
          />
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(400).duration(400)}
          className="mb-6 flex-row items-center"
        >
          <View className="h-px flex-1 bg-gray-300" />
          <Text className="mx-4 text-gray-500">or</Text>
          <View className="h-px flex-1 bg-gray-300" />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(500).duration(400).springify()} className="mb-6">
          <GradientButton
            title="Continue with Google"
            onPress={handleGoogleSignIn}
            variant="secondary"
            icon="logo-google"
            disabled={isLoading}
          />
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(600).duration(400)}
          className="flex-row justify-center"
        >
          <Text className="text-gray-600">Don&apos;t have an account? </Text>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable>
              <Text className="font-semibold text-pink-500">Sign Up</Text>
            </Pressable>
          </Link>
        </Animated.View>
      </View>
    </GradientBackground>
  );
}
