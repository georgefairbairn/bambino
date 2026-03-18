import { useUser } from '@clerk/clerk-expo';
import { useMutation } from 'convex/react';
import { useEffect } from 'react';
import * as Sentry from '@sentry/react-native';

import { api } from '@/convex/_generated/api';

export function useStoreUser() {
  const { isSignedIn, user } = useUser();
  const createOrUpdateUser = useMutation(api.users.createOrUpdateUser);

  useEffect(() => {
    if (!isSignedIn || !user) {
      return;
    }

    const syncUser = async () => {
      try {
        await createOrUpdateUser({
          email: user.primaryEmailAddress?.emailAddress ?? '',
          name: user.fullName ?? undefined,
          imageUrl: user.imageUrl ?? undefined,
        });
      } catch (error) {
        Sentry.captureException(error);
      }
    };

    syncUser();
  }, [isSignedIn, user, createOrUpdateUser]);
}
