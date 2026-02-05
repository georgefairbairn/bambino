import { SignedIn, SignedOut } from '@clerk/clerk-expo';
import { Redirect } from 'expo-router';

export default function Index() {
  return (
    <>
      <SignedIn>
        <Redirect href="/(tabs)/explore" />
      </SignedIn>
      <SignedOut>
        <Redirect href="/(auth)/sign-in" />
      </SignedOut>
    </>
  );
}
