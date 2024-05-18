import { Name } from '@prisma/client';
import { Volume2 } from 'lucide-react';
import { ORIGIN_MAP } from '~/utils/consts';

export default function NameBlock({ name }: { name: Name }) {
  const underlineColor =
    name?.gender.toLowerCase() === 'female'
      ? 'border-b-pink-500'
      : 'border-b-blue-500';

  const speakName = () => {
    const utterance = new SpeechSynthesisUtterance(name.name);
    speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex flex-col justify-start w-full">
      <div className="flex items-center">
        <span
          key={`name-${name}`}
          className={`text-6xl border-b-8 border-solid pb-4 ${underlineColor} sm:text-8xl mr-4`}
        >
          {name?.name}
        </span>
        <button
          className="px-2 mx-2 rounded-full hover:bg-black hover:bg-opacity-5"
          type="button"
          onClick={speakName}
        >
          <div className="h-fit">
            <Volume2 size={48} />
          </div>
        </button>
      </div>
      {name?.origin && (
        <div className="bg-white border-4 border-black rounded-lg py-5 px-10 text-xl mt-8 w-fit">
          <span>Origin:</span>
          <span>
            <strong>&nbsp;{name?.origin}</strong>
          </span>
          <span>&nbsp;{ORIGIN_MAP[name?.origin]}</span>
        </div>
      )}
      {name?.description && (
        <div className="bg-white border-4 border-black rounded-lg py-5 px-10 text-xl mt-8">
          {name.description}
        </div>
      )}
    </div>
  );
}
