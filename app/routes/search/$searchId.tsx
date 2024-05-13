import { ThumbsUp, ThumbsDown, RefreshCw } from 'lucide-react';
import { LoaderFunction, json, redirect } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { db } from '~/utils/db.server';
import Name from '~/routes/search/name/$nameId';
import { ROUTES } from '~/utils/consts';

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const index = parseInt(url.searchParams.get('index') || '0');

  const name = json({
    name: await db.name.findFirst({ skip: index, take: 1 }),
  });

  return redirect(`${ROUTES.SEARCH}/${search?.id ?? 1}`);
};

export default function Search() {
  const { name } = useLoaderData();

  return (
    <div className="flex justify-between max-w-4xl w-full mx-auto mt-28">
      <Name name={name} />

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
