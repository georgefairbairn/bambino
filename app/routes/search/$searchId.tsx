import {
  Volume2,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { db } from "~/utils/db.server";

export const loader = async () => {
  return json({
    name: await db.name.findFirst(),
  });
};

export default function Name() {
  const { name } = useLoaderData<typeof loader>();

  return (
    <div className="flex justify-between max-w-4xl w-full mx-auto">
      <div className="flex flex-col justify-start w-full">
        <div className="flex justify-between w-full">
          <div className="bg-black text-white text-4xl py-5 px-10 rounded-t-lg">
            {name?.name}
          </div>
          <div className="flex items-center">
            <div className="text-5xl text-pink-500 px-4">
              {name?.gender === "Female" ? "\u2640" : "\u2642"}
            </div>
            <div className="text-xl italic px-4 border-x-2 border-x-black">
              {name?.pronunciation}
            </div>
            <button className="px-2 mx-2 rounded-full hover:bg-black hover:bg-opacity-5">
              <Volume2 size={36} />
            </button>
          </div>
        </div>
        <div className="flex flex-col bg-white border-4 border-black rounded-tr-lg rounded-br-lg rounded-bl-lg py-5 px-10 text-xl">
          <div className="flex w-full">
            <div className="flex-1">
              <span className="pr-2">Origin:</span>
              <span className="pr-2">{name?.origin}</span>
            </div>
            <div className="flex-1">
              <span className="pr-2">Meaning:</span>
              <span className="font-bold">"REMOVE"</span>
            </div>
          </div>
          <div className="pt-5">{name?.description}</div>
          <div className="flex justify-center mt-8">
            <button className="flex items-center text-xl px-8 py-3 rounded-full w-fit hover:bg-black hover:bg-opacity-5">
              <span className="mr-3">Read more</span>
              <ChevronDown className="max-w-none" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col ml-10 justify-center">
        <button className="flex items-center bg-black text-white text-2xl px-8 py-3 rounded-full w-fit">
          <span className="mr-3">Like</span>
          <ThumbsUp className="max-w-none" />
        </button>
        <button className="flex items-center bg-black text-white text-2xl px-8 py-3 rounded-full my-10 w-fit">
          <span className="mr-3">Dislike</span>
          <ThumbsDown className="max-w-none" />
        </button>
        <button className="flex items-center text-2xl px-8 py-3 rounded-full w-fit hover:bg-black hover:bg-opacity-5">
          <span className="mr-3">Skip</span>
          <RefreshCw className="max-w-none" />
        </button>
      </div>
    </div>
  );
}
