import { useUser } from '@clerk/clerk-expo';
import { useMutation } from 'convex/react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';

import { api } from '@/convex/_generated/api';
import { Events, trackEvent } from '@/lib/analytics';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerToken(
  setPushToken: (args: { token: string; platform: 'ios' }) => Promise<unknown>,
) {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return;
  const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
  await setPushToken({ token: tokenResponse.data, platform: 'ios' });
}

/**
 * On sign-in, registers the push token IF permission is already granted.
 * Never calls requestPermissionsAsync — that's handled by the priming
 * sheet via usePushRequestPermission, gated on a contextual moment.
 *
 * Mount once at the tabs layout level.
 */
export function usePushRegistration() {
  const { isSignedIn } = useUser();
  const setPushToken = useMutation(api.users.setPushToken);
  // No user-row existence guard here: the (tabs) layout gates rendering on
  // getCurrentUser, so this hook only mounts once the row exists (#167).

  useEffect(() => {
    if (!isSignedIn) return;
    if (Platform.OS !== 'ios') return;
    if (!Device.isDevice) return;

    const refresh = async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') return;
        await registerToken(setPushToken);
      } catch (error) {
        Sentry.captureException(error);
      }
    };

    refresh();
  }, [isSignedIn, setPushToken]);
}

/**
 * Returns a function that drives the iOS notification permission prompt
 * and registers the push token if granted. Use from the priming sheet's
 * Allow button, not from a useEffect.
 */
export function usePushRequestPermission() {
  const setPushToken = useMutation(api.users.setPushToken);

  return useCallback(async (): Promise<Notifications.PermissionStatus> => {
    if (Platform.OS !== 'ios' || !Device.isDevice) {
      return Notifications.PermissionStatus.DENIED;
    }
    try {
      trackEvent(Events.PUSH_PERMISSION_REQUESTED);
      const { status } = await Notifications.requestPermissionsAsync();
      trackEvent(
        status === 'granted' ? Events.PUSH_PERMISSION_GRANTED : Events.PUSH_PERMISSION_DENIED,
      );
      if (status === 'granted') {
        await registerToken(setPushToken);
      }
      return status;
    } catch (error) {
      Sentry.captureException(error);
      return Notifications.PermissionStatus.DENIED;
    }
  }, [setPushToken]);
}
