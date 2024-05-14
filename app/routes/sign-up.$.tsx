import { SignUp } from '@clerk/remix';
import { ROUTES } from '~/utils/consts';

export default function SignInPage() {
  return (
    <div className="flex justify-center mt-10">
      <SignUp fallbackRedirectUrl={ROUTES.LIBRARY} />
    </div>
  );
}
