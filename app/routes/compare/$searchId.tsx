import { getAuth } from '@clerk/remix/ssr.server';
import type { ActionArgs, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { db } from '~/utils/db.server';
import { useLoaderData } from '@remix-run/react';
import type { Search, User } from '@prisma/client';
import Input from '~/components/input';
import Button from '~/components/button';
import { ArrowRight, Copy } from 'lucide-react';
import { useState } from 'react';
import { GENDER, ROUTES } from '~/utils/consts';

type LoaderData = {
  user: User;
  searchDetails: Search;
};

export const loader: LoaderFunction = async args => {
  const { userId } = await getAuth(args);

  if (!userId) {
    return redirect(process.env.CLERK_SIGN_IN_URL ?? '/');
  }

  const searchId = args.params.searchId;

  if (!searchId) return redirect(ROUTES.LIBRARY);

  const searchDetails = await db.search.findUnique({
    where: {
      id: parseInt(searchId),
    },
  });

  if (!searchDetails) {
    throw new Response('Search not found', { status: 404 });
  }

  return json({ searchDetails });
};

export const action = async (args: ActionArgs) => {
  try {
    const { userId } = await getAuth(args);

    const form = await args.request.formData();
    const sharingCode = form.get('sharingCode');
    const searchIdString = form.get('searchId');
    const name = form.get('name');

    if (
      typeof sharingCode !== 'string' ||
      typeof userId !== 'string' ||
      typeof searchIdString !== 'string' ||
      typeof name !== 'string'
    ) {
      throw new Error(`Form not submitted correctly.`);
    }

    const user = await db.user.findUnique({ where: { user_id: userId } });
    if (!user) return redirect(ROUTES.LIBRARY);

    const sharingUserSearch = await db.search.findUnique({
      where: { sharingCode },
    });

    if (!sharingUserSearch) return redirect(args.request.url);

    const searchId = parseInt(searchIdString);
    const pastingUserSearch = await db.search.findUnique({
      where: { id: searchId },
    });
    if (!pastingUserSearch) return redirect(args.request.url);

    let genderPreference = GENDER.BOTH;
    const sharingUserGenderPreference =
      sharingUserSearch.genderPreference as GENDER;
    const pastingUserGenderPreference =
      pastingUserSearch.genderPreference as GENDER;
    if (sharingUserGenderPreference === pastingUserGenderPreference) {
      genderPreference = sharingUserGenderPreference;
    }

    // Fetch user actions that belong to either the sharingUserSearch or pastingUserSearch
    const userActions = await db.userAction.findMany({
      where: {
        searchId: {
          in: [sharingUserSearch.id, pastingUserSearch.id],
        },
      },
    });

    // Remove duplicates based on the unique fields
    const uniqueUserActions = Array.from(
      new Map(userActions.map(action => [action.nameId, action])).values()
    );

    // Insert the unique user actions with the new combined search ID
    const combinedSearch = await db.search.create({
      data: {
        userId: user.id,
        sharedUserId: sharingUserSearch.userId,
        genderPreference,
        label: name,
      },
    });

    if (!combinedSearch.id) return redirect(args.request.url);

    await db.userAction.createMany({
      data: uniqueUserActions.map(action => ({
        nameId: action.nameId,
        actionType: action.actionType,
        searchId: combinedSearch.id,
      })),
    });

    return redirect(`${ROUTES.NAMES}/${combinedSearch.id}`);
  } catch (error) {
    console.error('Failed to create search:', error);
  }
};

export default function ComparePage() {
  const {
    searchDetails: { id, label, sharingCode },
  } = useLoaderData<LoaderData>();

  const [copied, setCopied] = useState(false);

  const onClick = () => {
    try {
      navigator.clipboard.writeText(sharingCode);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 3000);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex flex-col mt-8 mb-4">
      <h1 className="text-2xl font-bold mb-8">
        Compare <strong>{`"${label}"`}</strong> with others
      </h1>
      <div className="flex flex-col md:flex-row gap-12 md:gap-4 w-full">
        <form method="post" className="pr-8 flex flex-col flex-1">
          <h2 className="text-xl font-bold mb-4">Got a sharing code?</h2>
          <p className="mb-4">
            Enter it below to compare your liked names with someone else.
          </p>
          <input type="hidden" name="searchId" value={id} required />
          <Input
            className="mb-8 sm:w-9/12 pl-4 pr-4 py-2 border-4 border-black !rounded-lg max-w-xs"
            id="sharingCode"
            name="sharingCode"
            placeholder="Enter sharing code"
            required
          />
          <h2 className="font-bold text-lg">Label</h2>
          <p className="mb-4">
            Give your search a name so that you can easily find it again later
            (optional).
          </p>
          <Input
            className="mb-8 sm:w-9/12 pl-4 pr-4 py-2 border-4 border-black !rounded-lg max-w-xs"
            id="name"
            name="name"
            placeholder="Enter a name for your search"
            required
          />
          <Button type="submit" className="group">
            <span className="mr-2.5">Start</span>
            <ArrowRight
              size={24}
              className="group-hover:translate-x-2 transition-transform ease-in-out duration-300"
            />
          </Button>
        </form>

        <div className="md:pl-8 border-t-4 md:border-t-0 md:border-l-4 border-black flex flex-col flex-1">
          <h2 className="text-xl font-bold mb-4 mt-12 md:mt-0">
            {`Sharing code for ${label}`}
          </h2>
          <p className="mb-4">
            Share this code with someone else to compare this names list with
            them.
          </p>
          <div className="flex relative max-w-md">
            <button
              type="button"
              onClick={onClick}
              className={`border-4 border-black pl-4 pr-12 py-2 !rounded-lg flex justify-start w-full ${copied ? 'bg-black text-white justify-center' : 'bg-white text-black'}`}
            >
              <span className="truncate">
                {copied ? 'Copied!' : sharingCode}
              </span>
            </button>
            {!copied && (
              <button
                type="button"
                onClick={onClick}
                className="bg-black flex items-center px-2 my-0.5 -mx-10 rounded-r-lg"
              >
                <Copy size={24} className="text-white" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
