import { useSignUp, useSSO } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { GradientBackground } from '@/components/ui/gradient-background';
import { GradientButton } from '@/components/ui/gradient-button';
import { StyledInput } from '@/components/ui/styled-input';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { trackEvent, Events } from '@/lib/analytics';

WebBrowser.maybeCompleteAuthSession();

export default function SignUp() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const { startSSOFlow } = useSSO();
  const router = useRouter();

  const { colors } = useTheme();
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
        trackEvent(Events.SIGN_UP, { method: 'email' });
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
        trackEvent(Events.SIGN_UP, { method: 'google' });
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
      <GradientBackground variant="auth">
        <View className="flex-1 justify-center px-8">
          <Animated.Text
            entering={FadeInDown.duration(500).springify()}
            className="mb-2 text-center text-4xl"
            style={{
              fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular',
              color: colors.primary,
            }}
          >
            bambino
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(100).duration(400)}
            className="mb-4 text-center text-base text-gray-500"
          >
            Verify your email
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(100).duration(400)}
            className="mb-8 text-center text-gray-600"
          >
            We sent a verification code to {email}
          </Animated.Text>

          {error ? <Text className="mb-4 text-center text-red-600">{error}</Text> : null}

          <Animated.View entering={FadeInUp.delay(200).duration(400).springify()}>
            <StyledInput
              className="mb-6"
              style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8 }}
              placeholder="000000"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
            />
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(300).duration(400).springify()}>
            <GradientButton
              title="Verify Email"
              onPress={handleVerification}
              variant="primary"
              loading={isLoading}
              disabled={isLoading}
            />
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(400).duration(400)}
            className="mt-4 flex-row justify-center"
          >
            <Pressable
              onPress={() => {
                setPendingVerification(false);
                setCode('');
                setError('');
              }}
            >
              <Text className="font-semibold" style={{ color: colors.primary }}>
                Back to Sign Up
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground variant="auth">
      <View className="flex-1 justify-center px-8">
        <Animated.Text
          entering={FadeInDown.duration(500).springify()}
          className="mb-2 text-center text-4xl"
          style={{ fontFamily: Fonts?.display || 'AlfaSlabOne_400Regular', color: colors.primary }}
        >
          bambino
        </Animated.Text>
        <Animated.Text
          entering={FadeInDown.delay(100).duration(400)}
          className="mb-8 text-center text-base text-gray-500"
        >
          Create your account
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
            title="Sign Up"
            onPress={handleSignUp}
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
            onPress={handleGoogleSignUp}
            variant="secondary"
            icon="logo-google"
            disabled={isLoading}
          />
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(600).duration(400)}
          className="flex-row justify-center"
        >
          <Text className="text-gray-600">Already have an account? </Text>
          <Pressable onPress={() => router.replace('/(auth)/sign-in')}>
            <Text className="font-semibold" style={{ color: colors.primary }}>
              Sign In
            </Text>
          </Pressable>
        </Animated.View>

        <Text className="mt-6 text-center text-xs text-gray-400">
          By signing up, you agree to our{' '}
          <Text
            className="underline"
            style={{ color: colors.primary }}
            onPress={() =>
              WebBrowser.openBrowserAsync(
                'https://bambino-baby.notion.site/325d3b58308281768597f8bd57581eb7',
              )
            }
          >
            Terms of Service
          </Text>{' '}
          and{' '}
          <Text
            className="underline"
            style={{ color: colors.primary }}
            onPress={() =>
              WebBrowser.openBrowserAsync(
                'https://bambino-baby.notion.site/325d3b58308281158ce6c6cbdd562734',
              )
            }
          >
            Privacy Policy
          </Text>
        </Text>
      </View>
    </GradientBackground>
  );
}
