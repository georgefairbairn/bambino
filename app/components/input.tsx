interface Props {
  label?: string;
  className?: string;
}

export default function Input({
  id,
  label,
  placeholder,
  className,
  ...delegated
}: Props & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <>
      <label htmlFor={id} className="hidden">
        {label || placeholder}
      </label>
      <input
        id={id}
        placeholder={placeholder}
        className={`border-b-4 border-black p-1 pl-0 w-full focus:outline-none focus:ring-2 ring-offset-4 rounded-sm ${className}`}
        {...delegated}
      />
    </>
  );
}
