import React, { createContext, useContext, useCallback } from 'react';
import { useMutation, useQuery } from 'convex/react';
import * as Sentry from '@sentry/react-native';
import { api } from '@/convex/_generated/api';

interface OnboardingContextValue {
  // null while the Convex user query is still loading. true/false once known.
  hasCompletedOnboarding: boolean | null;
  isLoading: boolean;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

interface OnboardingProviderProps {
  children: React.ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  // Onboarding state is stored on the Convex user row (#154). Reading it
  // via useQuery means it follows the active Clerk identity automatically:
  // sign-out + sign-in on the same device sees the new user's flag, not
  // the old user's; a returning user's flag persists across launches.
  const user = useQuery(api.users.getCurrentUser);
  const setOnboardingCompleted = useMutation(api.users.setOnboardingCompleted);

  // user === undefined → query in flight.
  // user === null     → authenticated but Convex row not yet created
  //                     (race with useStoreUser's createOrUpdateUser on
  //                     first sign-in). Treat both as loading so we
  //                     don't briefly flash onboarding before the row
  //                     exists with onboardingCompleted=false.
  const isLoading = user === undefined || user === null;
  const hasCompletedOnboarding = isLoading ? null : user.onboardingCompleted === true;

  const completeOnboarding = useCallback(async () => {
    try {
      await setOnboardingCompleted({ completed: true });
    } catch (error) {
      Sentry.captureException(error);
    }
  }, [setOnboardingCompleted]);

  const resetOnboarding = useCallback(async () => {
    try {
      await setOnboardingCompleted({ completed: false });
    } catch (error) {
      Sentry.captureException(error);
    }
  }, [setOnboardingCompleted]);

  return (
    <OnboardingContext.Provider
      value={{ hasCompletedOnboarding, isLoading, completeOnboarding, resetOnboarding }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
