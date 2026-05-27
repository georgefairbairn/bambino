import { useUser } from '@clerk/clerk-expo';
import { useMutation } from 'convex/react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useEffect } from 'react';
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

export function usePushRegistration() {
  const { isSignedIn } = useUser();
  const setPushToken = useMutation(api.users.setPushToken);

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }

    if (Platform.OS !== 'ios') {
      return;
    }

    if (!Device.isDevice) {
      return;
    }

    const register = async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          trackEvent(Events.PUSH_PERMISSION_REQUESTED);
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
          trackEvent(
            status === 'granted' ? Events.PUSH_PERMISSION_GRANTED : Events.PUSH_PERMISSION_DENIED,
          );
        }

        if (finalStatus !== 'granted') {
          return;
        }

        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        if (!projectId) {
          return;
        }

        const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
        await setPushToken({ token: tokenResponse.data, platform: 'ios' });
      } catch (error) {
        Sentry.captureException(error);
      }
    };

    register();
  }, [isSignedIn, setPushToken]);
}
