import { useUser } from '@clerk/clerk-expo';
import { useMutation } from 'convex/react';
import { useEffect } from 'react';

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
        console.error('Failed to sync user to Convex:', error);
      }
    };

    syncUser();
  }, [isSignedIn, user, createOrUpdateUser]);
}
