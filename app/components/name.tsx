import type { Name } from '@prisma/client';
import { Volume2 } from 'lucide-react';
import { useEffect } from 'react';
import { ORIGIN_MAP, VOICE_GENDER } from '~/utils/consts';

export default function NameBlock({ name }: { name: Name }) {
  useEffect(() => {
    const locale = window.localStorage.getItem('locale');
    const voice = window.localStorage.getItem('voice');

    if (!locale) {
      window.localStorage.setItem('locale', navigator.language);
    }

    if (!voice) {
      window.localStorage.setItem('voice', VOICE_GENDER.FEMALE);
    }
  }, []);

  let underlineColor: string;
  if (name?.gender.toLowerCase() === 'female') {
    underlineColor = 'border-b-pink-500';
  } else if (name?.gender.toLowerCase() === 'male') {
    underlineColor = 'border-b-blue-500';
  } else {
    underlineColor = 'border-b-purple-500';
  }

  const speakName = async () => {
    try {
      const response = await fetch(
        `/api/tts?text=${name.name}&locale=${window.localStorage.getItem('locale')}&voice=${window.localStorage.getItem('voice')}`
      );
      const data = await response.json();

      if (data.error) {
        console.error(data.error);
        return;
      }

      const audio = new Audio('data:audio/mp3;base64,' + data.audioContent);
      audio.play();
    } catch (error) {
      console.error('Error:', error);
    }
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
