import { Check } from 'lucide-react';

export function SelectButton({
  onClick,
  isSelected,
  text,
  icon,
  type,
}: {
  onClick?: () => void;
  text: string | React.ReactNode;
  icon?: React.ReactNode;
  isSelected?: boolean;
  type?: 'button' | 'submit' | 'reset' | undefined;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex justify-between items-center bg-white border-4 border-black box-border rounded-md`}
      type={type ?? 'button'}
    >
      <div className="flex items-center flex-1 px-4">
        <span className="mr-2 font-bold text-lg">{text}</span>
        {icon}
      </div>

      {isSelected && (
        <div
          className={`flex self-stretch items-center bg-black rounded-none pl-1.5 pr-0.5`}
        >
          <Check size={18} color="white" className="" />
        </div>
      )}
    </button>
  );
}
