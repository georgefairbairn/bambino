import {
  Volume2,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { db } from '~/utils/db.server';
import { ORIGIN_MAP } from '~/utils/consts';

export const loader = async () => {
  return json({
    name: await db.name.findFirst(),
  });
};

export default function Name() {
  const { name } = useLoaderData<typeof loader>();

  const underlineColor =
    name?.gender.toLowerCase() === 'female'
      ? 'border-b-pink-500'
      : 'border-b-blue-500';

  return (
    <div className="flex justify-between max-w-4xl w-full mx-auto mt-28">
      <div className="flex flex-col justify-start w-full">
        <div className="flex items-center">
          <span
            key={`name-${name}`}
            className={`text-6xl border-b-8 border-solid pb-4 ${underlineColor} sm:text-8xl mr-4`}
          >
            {name?.name}
          </span>
          <button className="px-2 mx-2 rounded-full hover:bg-black hover:bg-opacity-5">
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
            <span>&nbsp;{ORIGIN_MAP[name?.origin.toLowerCase()]}</span>
          </div>
        )}
        {name?.description && (
          <div className="bg-white border-4 border-black rounded-lg py-5 px-10 text-xl mt-8">
            {name.description}
          </div>
        )}
      </div>

      <div className="flex flex-col ml-10 justify-center">
        <button className="flex items-center bg-black text-white text-2xl px-8 py-3 rounded-full w-fit group">
          <span className="mr-3">Like</span>
          <ThumbsUp className="max-w-none group-hover:-rotate-6 group-hover:scale-125 transition" />
        </button>
        <button className="flex items-center bg-black text-white text-2xl px-8 py-3 rounded-full my-10 w-fit group">
          <span className="mr-3">Dislike</span>
          <ThumbsDown className="max-w-none group-hover:-rotate-6 group-hover:scale-125 transition" />
        </button>
        <button className="flex items-center text-2xl px-8 py-3 rounded-full w-fit hover:bg-black hover:bg-opacity-5 group">
          <span className="mr-3">Skip</span>
          <RefreshCw className="max-w-none group-hover:rotate-180 group-hover:scale-125 transition" />
        </button>
      </div>
    </div>
  );
}
