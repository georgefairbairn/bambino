import { Link } from "@remix-run/react";

interface Props {
  children: React.ReactNode;
  to: string;
  className?: string;
}

export default function ButtonLink({
  children,
  className,
  to,
  ...delegated
}: Props & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <Link
      to={to}
      className={`flex items-center bg-black text-white px-6 py-3 rounded-lg w-fit ${className} sm:text-lg`}
      {...delegated}
    >
      {children}
    </Link>
  );
}
