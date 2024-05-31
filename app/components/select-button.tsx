import { Check } from 'lucide-react';

export function SelectButton({
  onClick,
  isSelected,
  text,
  icon,
}: {
  onClick: () => void;
  text: string;
  icon?: React.ReactNode;
  isSelected?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex justify-between items-center bg-white border-4 border-black box-border rounded-md`}
      type="button"
    >
      <div className="flex items-center flex-1 px-4">
        <p className="mr-2 font-bold text-lg">{text}</p>
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
