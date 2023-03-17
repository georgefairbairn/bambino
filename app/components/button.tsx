interface Props {
  children: React.ReactNode;
  className?: string;
}

export default function Button({
  children,
  className,
  ...delegated
}: Props & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`flex items-center bg-black text-white px-6 py-3 rounded-lg w-fit ${className} sm:text-xl`}
      {...delegated}
    >
      {children}
    </button>
  );
}
