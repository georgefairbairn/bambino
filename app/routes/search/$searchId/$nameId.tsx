import { ThumbsUp, ThumbsDown, RefreshCw, ArrowLeft, Baby } from 'lucide-react';
import { Link, useSearchParams } from '@remix-run/react';
import type { ActionArgs } from '@remix-run/node';
import { LoaderFunction, json, redirect } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { db } from '~/utils/db.server';
import Name from '~/components/name';
import { ROUTES } from '~/utils/consts';
import { useEffect } from 'react';

export const loader: LoaderFunction = async ({ params }) => {
  const { nameId, searchId } = params;

  if (!nameId) {
    throw new Response('Name ID not found', { status: 404 });
  }

  // Fetch the name based on the nameId
  const name = await db.name.findUnique({ where: { id: parseInt(nameId) } });

  if (!name) {
    throw new Response('Name not found', { status: 404 });
  }

  return json({ name, searchId });
};

export const action = async ({ request, params }: ActionArgs) => {
  const formData = await request.formData();
  const nameId = formData.get('nameId');
  const actionType = formData.get('actionType');
  const searchId = params.searchId;

  if (typeof nameId !== 'string' || typeof actionType !== 'string') {
    return json({ error: 'Invalid input' }, { status: 400 });
  }

  if (!searchId) return redirect(ROUTES.LIBRARY);

  try {
    await db.userAction.upsert({
      where: {
        searchId_nameId: {
          searchId: parseInt(searchId),
          nameId: parseInt(nameId),
        },
      },
      update: {
        actionType: actionType,
      },
      create: {
        searchId: parseInt(searchId),
        nameId: parseInt(nameId),
        actionType: actionType,
      },
    });

    await db.search.update({
      data: { lastUpdated: new Date() },
      where: { id: parseInt(searchId) },
    });

    return redirect(`${ROUTES.SEARCH}/${searchId}`);
  } catch (error) {
    console.error('Failed to record user action:', error);
    return json({ error: 'Failed to record action' }, { status: 500 });
  }
};

export default function Search() {
  const { name, searchId } = useLoaderData();

  return (
    <div className="flex flex-col max-w-4xl w-full mx-auto my-28">
      <form method="post" className="flex justify-between">
        <Name name={name} />
        <div className="flex flex-col ml-10 justify-center">
          <input type="hidden" name="nameId" value={name?.id} />
          <button
            type="submit"
            name="actionType"
            value="like"
            className="flex items-center bg-black text-white text-2xl px-8 py-3 rounded-full w-fit group"
          >
            <span className="mr-3">Like</span>
            <ThumbsUp className="max-w-none group-hover:-rotate-6 group-hover:scale-125 transition" />
          </button>
          <button
            type="submit"
            name="actionType"
            value="dislike"
            className="flex items-center bg-black text-white text-2xl px-8 py-3 rounded-full my-10 w-fit group"
          >
            <span className="mr-3">Dislike</span>
            <ThumbsDown className="max-w-none group-hover:-rotate-6 group-hover:scale-125 transition" />
          </button>
          <button
            type="submit"
            name="actionType"
            value="skip"
            className="flex items-center text-2xl px-8 py-3 rounded-full w-fit hover:bg-black hover:bg-opacity-5 group"
          >
            <span className="mr-3">Skip</span>
            <RefreshCw className="max-w-none group-hover:rotate-180 group-hover:scale-125 transition" />
          </button>
        </div>
      </form>
      <div className="flex justify-between mt-28">
        <Link to={ROUTES.LIBRARY} className="flex group items-center">
          <ArrowLeft
            size={24}
            className="group-hover:-translate-x-2 transition-transform ease-in-out duration-300"
          />
          <span className="ml-2 group-hover:underline underline-offset-8 text-lg">
            Back to Library
          </span>
        </Link>
        <Link
          to={`${ROUTES.NAMES}/${searchId}`}
          className="flex group items-center"
        >
          <span className="mr-2 group-hover:underline underline-offset-8 text-lg">
            View names shortlist
          </span>
          <Baby size={24} className="group-hover:scale-125 transition" />
        </Link>
      </div>
    </div>
  );
}
