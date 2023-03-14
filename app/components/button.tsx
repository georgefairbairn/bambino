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
      className={`flex items-center bg-black text-white text-xl px-8 py-3 rounded-lg w-fit ${className}`}
      {...delegated}
    >
      {children}
    </button>
  );
}
