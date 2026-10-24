import { useUser } from '@clerk/clerk-expo';
import { useMutation } from 'convex/react';
import { useEffect } from 'react';
import * as Sentry from '@sentry/react-native';

import { api } from '@/convex/_generated/api';
import { Events, identifyUser, trackEvent } from '@/lib/analytics';
import { logMetaRegistration } from '@/lib/meta';
import { identifyPurchaser } from '@/hooks/use-purchases';

type ClerkUser = NonNullable<ReturnType<typeof useUser>['user']>;

function signUpMethod(user: ClerkUser): string {
  const provider = user.externalAccounts[0]?.provider;
  if (provider === 'google' || provider === 'apple') return provider;
  return 'email';
}

export function useStoreUser() {
  const { isSignedIn, user } = useUser();
  const createOrUpdateUser = useMutation(api.users.createOrUpdateUser);

  useEffect(() => {
    if (!isSignedIn || !user) {
      return;
    }

    const email = user.primaryEmailAddress?.emailAddress ?? '';
    const name = user.fullName ?? undefined;

    Sentry.setUser({ id: user.id, email });
    identifyUser(user.id, {
      ...(email ? { email } : {}),
    });
    identifyPurchaser({ id: user.id, email, name });

    const syncUser = async () => {
      try {
        const { created } = await createOrUpdateUser({
          email,
          name,
          imageUrl: user.imageUrl ?? undefined,
        });
        // Only true for the call that inserted the row, so each account
        // counts as a sign-up once, whichever screen it signed up from. The
        // auth screens can't tell: Apple/Google SSO from Sign In creates new
        // accounts too, and from Sign Up can land on an existing one.
        if (created) {
          trackEvent(Events.SIGN_UP, { method: signUpMethod(user) });
          logMetaRegistration();
        }
      } catch (error) {
        Sentry.captureException(error);
      }
    };

    syncUser();
  }, [isSignedIn, user, createOrUpdateUser]);
}
