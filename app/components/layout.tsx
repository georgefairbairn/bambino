import { Link, useLocation } from '@remix-run/react';
import { ROUTES } from '../utils/consts';
import { UserButton, SignInButton, useAuth } from '@clerk/remix';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { isLoaded, userId } = useAuth();
  const { pathname } = useLocation();

  return (
    <div className="flex p-5 md:px-10 xl:px-16 flex-col min-h-screen">
      <div className="flex">
        <div className="flex-1" />
        <Link to={ROUTES.HOME}>
          <h1 className="text-4xl font-alfaSlab text-center sm:text-5xl">
            bambino
          </h1>
        </Link>
        <div className="flex-1 flex items-center justify-end">
          {isLoaded && userId ? <UserButton /> : <SignInButton />}
        </div>
      </div>
      <div className="flex flex-col justify-between flex-1">
        {children}
        <div className="flex justify-center">
          {pathname !== ROUTES.PRIVACY_POLICY && (
            <Link className="group" to={ROUTES.PRIVACY_POLICY}>
              <span className="group-hover:underline underline-offset-8">
                Privacy Policy
              </span>
            </Link>
          )}
          <Link className="group ml-10" to={ROUTES.CONTACT_US}>
            <span className="group-hover:underline underline-offset-8">
              Contact Us
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
