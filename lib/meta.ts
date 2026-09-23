import * as Sentry from '@sentry/react-native';
import { AppEventsLogger } from 'react-native-fbsdk-next';

// Meta's SDK logs installs and app opens itself (autoLogAppEventsEnabled in
// app.config.ts). A new account is the one event we send by hand.
export function logMetaRegistration() {
  if (__DEV__) return;
  try {
    AppEventsLogger.logEvent(AppEventsLogger.AppEvents.CompletedRegistration);
  } catch (error) {
    Sentry.captureException(error);
  }
}
