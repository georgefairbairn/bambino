import { useSignIn, useSignInWithApple, useSSO } from '@clerk/clerk-expo';
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
import { Events, trackEvent } from '@/lib/analytics';
import { getClerkErrorMessage, reportClerkError } from '@/lib/clerk-errors';
import { SSO_REDIRECT_URL } from '@/lib/sso';

WebBrowser.maybeCompleteAuthSession();

export default function SignIn() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();
  const { startAppleAuthenticationFlow } = useSignInWithApple();
  const router = useRouter();

  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMethod, setLoadingMethod] = useState<'email' | 'google' | 'apple' | null>(null);
  const [error, setError] = useState('');
  const [resetFlow, setResetFlow] = useState<'idle' | 'code' | 'new-password'>('idle');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleSignIn = useCallback(async () => {
    if (!isLoaded) return;

    setIsLoading(true);
    setLoadingMethod('email');
    setError('');

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        trackEvent(Events.SIGN_IN, { method: 'email' });
        router.replace('/');
      }
    } catch (err: unknown) {
      const message = getClerkErrorMessage(err, 'Sign in failed');
      setError(message);
      reportClerkError(err, { flow: 'sign_in', method: 'email' });
      trackEvent(Events.SIGN_IN_FAILED, { method: 'email', reason: message });
    } finally {
      setIsLoading(false);
      setLoadingMethod(null);
    }
  }, [isLoaded, signIn, email, password, setActive, router]);

  const handleForgotPassword = useCallback(async () => {
    if (!isLoaded) return;
    if (!email) {
      setError('Please enter your email first');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });
      setResetFlow('code');
    } catch (err: unknown) {
      setError(getClerkErrorMessage(err, 'Failed to send reset code'));
      reportClerkError(err, { flow: 'forgot_password' });
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, signIn, email]);

  const handleVerifyCode = useCallback(async () => {
    if (!isLoaded) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
      });

      if (result.status === 'needs_new_password') {
        setResetFlow('new-password');
      }
    } catch (err: unknown) {
      setError(getClerkErrorMessage(err, 'Invalid code'));
      reportClerkError(err, { flow: 'reset_password_verify' });
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, signIn, code]);

  const handleResetPassword = useCallback(async () => {
    if (!isLoaded) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await signIn.resetPassword({ password: newPassword });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/');
      }
    } catch (err: unknown) {
      setError(getClerkErrorMessage(err, 'Failed to reset password'));
      reportClerkError(err, { flow: 'reset_password' });
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, signIn, newPassword, setActive, router]);

  const handleGoogleSignIn = useCallback(async () => {
    setIsLoading(true);
    setLoadingMethod('google');
    setError('');

    try {
      // redirectUrl must be in Clerk Dashboard → Native applications → Allowed
      // redirect URLs. A "redirect url mismatch" error means it's missing there
      // (see docs/clerk-setup.md).
      const { createdSessionId, setActive: ssoSetActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: SSO_REDIRECT_URL,
      });

      if (createdSessionId && ssoSetActive) {
        await ssoSetActive({ session: createdSessionId });
        trackEvent(Events.SIGN_IN, { method: 'google' });
        router.replace('/');
      }
    } catch (err: unknown) {
      const message = getClerkErrorMessage(err, 'Google sign in failed');
      setError(message);
      reportClerkError(err, { flow: 'sign_in', method: 'google' });
      trackEvent(Events.SIGN_IN_FAILED, { method: 'google', reason: message });
    } finally {
      setIsLoading(false);
      setLoadingMethod(null);
    }
  }, [startSSOFlow, router]);

  const handleAppleSignIn = useCallback(async () => {
    setIsLoading(true);
    setLoadingMethod('apple');
    setError('');

    try {
      const { createdSessionId, setActive: appleSetActive } = await startAppleAuthenticationFlow();

      if (createdSessionId && appleSetActive) {
        await appleSetActive({ session: createdSessionId });
        trackEvent(Events.SIGN_IN, { method: 'apple' });
        router.replace('/');
      }
    } catch (err: unknown) {
      const appleError = err as { code?: string };
      if (appleError.code === 'ERR_REQUEST_CANCELED') return;
      const message = getClerkErrorMessage(err, 'Apple sign in failed');
      setError(message);
      reportClerkError(err, { flow: 'sign_in', method: 'apple' });
      trackEvent(Events.SIGN_IN_FAILED, { method: 'apple', reason: message });
    } finally {
      setIsLoading(false);
      setLoadingMethod(null);
    }
  }, [startAppleAuthenticationFlow, router]);

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
          {resetFlow === 'idle' && 'Sign in to your account'}
          {resetFlow === 'code' && 'Enter the code sent to your email'}
          {resetFlow === 'new-password' && 'Choose a new password'}
        </Animated.Text>

        {error ? <Text className="mb-4 text-center text-red-600">{error}</Text> : null}

        {resetFlow === 'idle' && (
          <>
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
                className="mb-2"
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </Animated.View>

            <Animated.View
              entering={FadeInUp.delay(250).duration(400)}
              className="mb-6 flex-row justify-end"
            >
              <Pressable onPress={handleForgotPassword}>
                <Text className="text-sm" style={{ color: colors.primary }}>
                  Forgot password?
                </Text>
              </Pressable>
            </Animated.View>

            <Animated.View
              entering={FadeInUp.delay(300).duration(400).springify()}
              className="mb-4"
            >
              <GradientButton
                title="Sign In"
                onPress={handleSignIn}
                variant="primary"
                loading={loadingMethod === 'email'}
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

            <Animated.View
              entering={FadeInUp.delay(500).duration(400).springify()}
              className="mb-4"
            >
              <GradientButton
                title="Continue with Google"
                onPress={handleGoogleSignIn}
                variant="secondary"
                icon="logo-google"
                loading={loadingMethod === 'google'}
                disabled={isLoading}
              />
            </Animated.View>

            <Animated.View
              entering={FadeInUp.delay(600).duration(400).springify()}
              className="mb-6"
            >
              <GradientButton
                title="Continue with Apple"
                onPress={handleAppleSignIn}
                variant="secondary"
                icon="logo-apple"
                loading={loadingMethod === 'apple'}
                disabled={isLoading}
              />
            </Animated.View>

            <Animated.View
              entering={FadeInUp.delay(700).duration(400)}
              className="flex-row justify-center"
            >
              <Text className="text-gray-600">Don&apos;t have an account? </Text>
              <Pressable onPress={() => router.replace('/(auth)/sign-up')}>
                <Text className="font-semibold" style={{ color: colors.primary }}>
                  Sign Up
                </Text>
              </Pressable>
            </Animated.View>
          </>
        )}

        {resetFlow === 'code' && (
          <>
            <Animated.View entering={FadeInUp.duration(400).springify()}>
              <StyledInput
                className="mb-6"
                placeholder="Verification code"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
              />
            </Animated.View>

            <Animated.View
              entering={FadeInUp.delay(100).duration(400).springify()}
              className="mb-4"
            >
              <GradientButton
                title="Verify Code"
                onPress={handleVerifyCode}
                variant="primary"
                loading={isLoading}
                disabled={isLoading}
              />
            </Animated.View>

            <Animated.View
              entering={FadeInUp.delay(200).duration(400)}
              className="flex-row justify-center"
            >
              <Pressable
                onPress={() => {
                  setResetFlow('idle');
                  setError('');
                  setCode('');
                  setNewPassword('');
                }}
              >
                <Text className="font-semibold" style={{ color: colors.primary }}>
                  Back to Sign In
                </Text>
              </Pressable>
            </Animated.View>
          </>
        )}

        {resetFlow === 'new-password' && (
          <>
            <Animated.View entering={FadeInUp.duration(400).springify()}>
              <StyledInput
                className="mb-6"
                placeholder="New password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
            </Animated.View>

            <Animated.View
              entering={FadeInUp.delay(100).duration(400).springify()}
              className="mb-4"
            >
              <GradientButton
                title="Reset Password"
                onPress={handleResetPassword}
                variant="primary"
                loading={isLoading}
                disabled={isLoading}
              />
            </Animated.View>
          </>
        )}
      </View>
    </GradientBackground>
  );
}
