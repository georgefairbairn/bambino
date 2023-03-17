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
      className={`flex items-center bg-black text-white px-8 py-3 rounded-lg w-fit ${className} sm:text-xl`}
      {...delegated}
    >
      {children}
    </Link>
  );
}
