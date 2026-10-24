import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { PushPrimingSheet, type PushPrimingReason } from '@/components/push/push-priming-sheet';
import { usePushPriming } from '@/hooks/use-push-priming';
import { usePushRequestPermission } from '@/hooks/use-push-registration';

// Give a just-closed native share sheet or bottom sheet time to finish
// animating out. iOS drops a modal presented mid-dismissal.
const PRESENT_DELAY_MS = 600;

interface PushPrimingContextValue {
  /** Show the priming sheet if this user hasn't been asked yet (or the cooldown is up). */
  promptForPush: (reason: PushPrimingReason) => Promise<void>;
}

const PushPrimingContext = createContext<PushPrimingContextValue | undefined>(undefined);

/**
 * Owns the single push-priming sheet for the tab tree, so any screen can ask
 * at the moment notifications become valuable: a fresh match, or right after
 * sharing a partner code (we'll tell them when their partner joins).
 *
 * Mount inside the Convex provider — the Allow button registers the token.
 */
export function PushPrimingProvider({ children }: { children: React.ReactNode }) {
  const { shouldPrime, markAsked, markDismissed } = usePushPriming();
  const requestPermission = usePushRequestPermission();
  const [reason, setReason] = useState<PushPrimingReason | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const promptForPush = useCallback(
    async (next: PushPrimingReason) => {
      if (!(await shouldPrime())) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setReason(next), PRESENT_DELAY_MS);
    },
    [shouldPrime],
  );

  return (
    <PushPrimingContext.Provider value={{ promptForPush }}>
      {children}
      <PushPrimingSheet
        visible={reason !== null}
        reason={reason ?? 'match'}
        onAllow={async () => {
          await requestPermission(reason ?? 'match');
          await markAsked();
          setReason(null);
        }}
        onDismiss={async () => {
          await markDismissed();
          setReason(null);
        }}
      />
    </PushPrimingContext.Provider>
  );
}

export function usePushPrimingPrompt() {
  const context = useContext(PushPrimingContext);
  if (!context) {
    throw new Error('usePushPrimingPrompt must be used within a PushPrimingProvider');
  }
  return context.promptForPush;
}
