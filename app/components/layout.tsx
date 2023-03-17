import { Link } from "@remix-run/react";
import { ROUTES } from "../utils/consts";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex p-5 flex-col">
      <Link to={ROUTES.HOME} className="mb-16 sm:mb-24">
        <h1 className="text-4xl font-alfaSlab text-center sm:text-5xl">
          bambino
        </h1>
      </Link>
      {children}
    </div>
  );
}
