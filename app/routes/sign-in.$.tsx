import { SignIn } from '@clerk/remix';

export default function SignInPage() {
  return (
    <div className="flex justify-center mt-10">
      <SignIn />
    </div>
  );
}
