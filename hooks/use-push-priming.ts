import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { useCallback, useEffect, useRef, useState } from 'react';

const STATE_KEY = 'bambino_push_priming_state';
// How long to wait before re-priming after a "Not now". The user only sees
// the sheet at all on a fresh match, so this just guards against multiple
// matches in a single week from feeling spammy.
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

type State = {
  // True when the user tapped Allow (whether or not iOS granted) — never re-ask.
  asked: boolean;
  // Timestamp of the most recent "Not now" tap.
  dismissedAt: number | null;
};

const DEFAULT_STATE: State = { asked: false, dismissedAt: null };

async function loadState(): Promise<State> {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<State>;
    return {
      asked: parsed.asked === true,
      dismissedAt: typeof parsed.dismissedAt === 'number' ? parsed.dismissedAt : null,
    };
  } catch (error) {
    Sentry.captureException(error);
    return DEFAULT_STATE;
  }
}

async function saveState(state: State): Promise<void> {
  try {
    await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (error) {
    Sentry.captureException(error);
  }
}

export function usePushPriming() {
  const [isReady, setIsReady] = useState(false);
  const stateRef = useRef<State>(DEFAULT_STATE);

  useEffect(() => {
    let cancelled = false;
    loadState().then((state) => {
      if (cancelled) return;
      stateRef.current = state;
      setIsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const shouldPrime = useCallback(async () => {
    if (!isReady) return false;
    if (Platform.OS !== 'ios') return false;
    const { asked, dismissedAt } = stateRef.current;
    if (asked) return false;
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_COOLDOWN_MS) return false;
    try {
      const { status } = await Notifications.getPermissionsAsync();
      // Only show if iOS hasn't decided yet — granted/denied are permanent
      // and the system won't re-prompt.
      return status === Notifications.PermissionStatus.UNDETERMINED;
    } catch (error) {
      Sentry.captureException(error);
      return false;
    }
  }, [isReady]);

  const markAsked = useCallback(async () => {
    stateRef.current = { ...stateRef.current, asked: true };
    await saveState(stateRef.current);
  }, []);

  const markDismissed = useCallback(async () => {
    stateRef.current = { ...stateRef.current, dismissedAt: Date.now() };
    await saveState(stateRef.current);
  }, []);

  return {
    shouldPrime,
    markAsked,
    markDismissed,
  };
}
