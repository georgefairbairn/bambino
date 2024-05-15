import {
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  ArrowLeft,
  Archive,
} from 'lucide-react';
import { Link } from '@remix-run/react';
import type { ActionArgs } from '@remix-run/node';
import { LoaderFunction, json, redirect } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { db } from '~/utils/db.server';
import Name from '~/routes/search/name/$nameId';
import { ROUTES } from '~/utils/consts';

export const loader: LoaderFunction = async ({ params }) => {
  const searchId = params.searchId;
  if (!searchId) return redirect(ROUTES.LIBRARY);

  const searchDetails = await db.search.findUnique({
    where: {
      id: parseInt(searchId),
    },
  });

  if (!searchDetails) {
    throw new Response('Search not found', { status: 404 });
  }

  const genderPreference = searchDetails.genderPreference;
  const genderConditions = [
    ...(genderPreference !== 'girl' ? [{ gender: 'male' }] : []),
    ...(genderPreference !== 'boy' ? [{ gender: 'female' }] : []),
    { gender: 'unisex' },
  ];

  try {
    const totalNamesCount = await db.name.count({
      where: {
        OR: genderConditions,
        NOT: {
          userActions: {
            some: {
              searchId: parseInt(searchId),
              actionType: {
                in: ['like', 'dislike'],
              },
            },
          },
        },
      },
    });

    if (totalNamesCount === 0) {
      throw new Response('No available names left to display', { status: 404 });
    }

    const randomName = await db.name.findFirst({
      where: {
        OR: genderConditions,
        NOT: {
          userActions: {
            some: {
              searchId: parseInt(searchId),
              actionType: {
                in: ['like', 'dislike'],
              },
            },
          },
        },
      },
      take: 1,
      skip: Math.floor(Math.random() * totalNamesCount),
    });

    if (!randomName) {
      throw new Response('No available names left to display', { status: 404 });
    }

    return json({ name: randomName });
  } catch (error) {
    console.error('Failed to fetch a random name:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
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
  const { name } = useLoaderData();

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
        {/* TODO: Update route to new page */}
        <Link to={ROUTES.LIBRARY} className="flex group items-center">
          <span className="mr-2 group-hover:underline underline-offset-8 text-lg">
            View liked names
          </span>
          <Archive size={24} className="group-hover:scale-125 transition" />
        </Link>
      </div>
    </div>
  );
}
