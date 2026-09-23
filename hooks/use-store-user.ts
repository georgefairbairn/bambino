import { useUser } from '@clerk/clerk-expo';
import { useMutation } from 'convex/react';
import { useEffect } from 'react';
import * as Sentry from '@sentry/react-native';

import { api } from '@/convex/_generated/api';
import { identifyUser } from '@/lib/analytics';
import { logMetaRegistration } from '@/lib/meta';

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

    const syncUser = async () => {
      try {
        const { created } = await createOrUpdateUser({
          email,
          name,
          imageUrl: user.imageUrl ?? undefined,
        });
        // Only true for the call that inserted the row, so each account
        // registers with Meta once, whichever screen it signed up from.
        if (created) logMetaRegistration();
      } catch (error) {
        Sentry.captureException(error);
      }
    };

    syncUser();
  }, [isSignedIn, user, createOrUpdateUser]);
}
