import { Link } from "@remix-run/react";
import { ROUTES } from "../utils/consts";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex pt-5 flex-col">
      <Link to={ROUTES.HOME} className="mb-24">
        <h1 className="text-5xl font-alfaSlab text-center">bambino</h1>
      </Link>
      {children}
    </div>
  );
}
