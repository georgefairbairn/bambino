import { Link } from '@remix-run/react';
import { ROUTES } from '../utils/consts';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex p-5 md:px-10 xl:px-16 flex-col">
      <Link to={ROUTES.HOME}>
        <h1 className="text-4xl font-alfaSlab text-center sm:text-5xl">
          bambino
        </h1>
      </Link>
      {children}
    </div>
  );
}
