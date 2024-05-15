import { SignUp } from '@clerk/remix';
import { ROUTES } from '~/utils/consts';
import { LoaderFunction, json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';

export const loader: LoaderFunction = async _args => {
  return json({
    rootUrl: process.env.ROOT_URL,
  });
};

export default function SignInPage() {
  const { rootUrl } = useLoaderData();
  const redirectUrl = `${rootUrl}${ROUTES.LIBRARY}`;

  return (
    <div className="flex justify-center mt-10">
      <SignUp forceRedirectUrl={redirectUrl} />
    </div>
  );
}
