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
import { ROUTES } from '~/utils/consts';

type LoaderData = {
  user: User;
  searchDetails: Search;
};

export const loader: LoaderFunction = async args => {
  const { userId } = await getAuth(args);

  if (!userId) {
    return redirect(process.env.CLERK_SIGN_IN_URL ?? '/');
  }

  const user = await db.user.findUnique({
    where: { user_id: userId },
  });

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

  return json({ user, searchDetails });
};

export const action = async ({ request }: ActionArgs) => {};

export default function ComparePage() {
  const {
    user: { sharingCode },
    searchDetails: { label },
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
        <div className="pr-8 flex flex-col flex-1">
          <h2 className="text-xl font-bold mb-4">Got a sharing code?</h2>
          <p className="mb-4">
            Enter it below to compare your list with someone else.
          </p>
          <Input
            className="mb-8 sm:w-9/12 pl-4 pr-4 py-2 border-4 border-black !rounded-lg max-w-xs"
            id="sharingCode"
            name="sharingCode"
            placeholder="Enter sharing code"
            required
          />
          <Button type="submit" className="group">
            <span className="mr-2.5">Start</span>
            <ArrowRight
              size={24}
              className="group-hover:translate-x-2 transition-transform ease-in-out duration-300"
            />
          </Button>
        </div>

        <div className="md:pl-8 border-t-4 md:border-t-0 md:border-l-4 border-black flex flex-col flex-1">
          <h2 className="text-xl font-bold mb-4 mt-12 md:mt-0">
            Your sharing code
          </h2>
          <p className="mb-4">
            Share your code with someone else to start comparing.
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
