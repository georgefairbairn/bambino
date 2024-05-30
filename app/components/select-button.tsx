import { Check } from 'lucide-react';

export function SelectButton({
  onClick,
  disabled,
  isSelected,
  text,
  icon,
}: {
  onClick: () => void;
  text: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  isSelected?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`flex justify-between items-center bg-white border-4 ${disabled ? 'opacity-65 border-opacity-65 bg-opacity-65' : 'border-opacity-100 opacity-100 bg-opacity-100'} border-black box-border rounded-md`}
      type="button"
    >
      <div className="flex items-center flex-1 px-4">
        <p className="mr-2 font-bold text-lg">{text}</p>
        {icon}
      </div>

      {isSelected && (
        <div
          className={`flex self-stretch items-center bg-black ${disabled ? 'bg-opacity-65' : 'bg-opacity-100'} rounded-none pl-1.5 pr-0.5`}
        >
          <Check size={18} color="white" className="" />
        </div>
      )}
    </button>
  );
}
