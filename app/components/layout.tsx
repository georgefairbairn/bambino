import { Link } from '@remix-run/react';
import { ROUTES } from '../utils/consts';
import { UserButton, SignInButton, useAuth } from '@clerk/remix';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { isLoaded, userId } = useAuth();

  return (
    <div className="flex p-5 md:px-10 xl:px-16 flex-col">
      <div className="flex">
        <div className="flex-1" />
        <Link to={ROUTES.HOME}>
          <h1 className="text-4xl font-alfaSlab text-center sm:text-5xl">
            bambino
          </h1>
        </Link>
        <div className="flex-1 flex items-center justify-end">
          {isLoaded && userId ? (
            <UserButton />
          ) : (
            <SignInButton fallbackRedirectUrl="/search" />
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
