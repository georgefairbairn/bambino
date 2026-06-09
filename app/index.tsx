import { SignedIn, SignedOut } from '@clerk/clerk-expo';
import { Redirect } from 'expo-router';

import { LoadingScreen } from '@/components/ui/loading-screen';

export default function Index() {
  // Paint the loader (not a blank screen) while the auth redirect resolves.
  // index.tsx is the active route for a beat after the root AuthGate hands off
  // and before (tabs)/_layout mounts its own loader. Rendering only <Redirect>
  // here left the bare navigator background showing — a white flash between the
  // two loading animations on cold launch. The shared bounce clock keeps this
  // loader in-phase with the one before and after it, so it reads as continuous.
  return (
    <>
      <LoadingScreen />
      <SignedIn>
        <Redirect href="/(tabs)/explore" />
      </SignedIn>
      <SignedOut>
        <Redirect href="/(auth)/sign-in" />
      </SignedOut>
    </>
  );
}
