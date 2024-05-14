import SkeletonSearchCard from '~/components/skeleton-search-card';
import { Info } from 'lucide-react';
import { getAuth } from '@clerk/remix/ssr.server';
import { LoaderFunction, redirect } from '@remix-run/node';
import { db } from '~/utils/db.server';

export const loader: LoaderFunction = async args => {
  const { userId } = await getAuth(args);

  if (!userId) {
    return redirect(process.env.CLERK_SIGN_IN_URL ?? '/');
  }

  try {
    const existingUser = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!existingUser) {
      await db.user.create({ data: { clerkUserId: userId } });
    }
  } catch (error) {
    console.error('Failed to insert or retrieve user:', error);
  }

  return {};
};

export default function Library() {
  return (
    <>
      <div className="flex items-center mt-8 mb-4">
        <h1 className="text-2xl font-bold mr-2">Searches</h1>
        {/* TODO: Add tooltip/modal to explain what Searches is */}
        <button>
          <Info size={18} className="mt-0.5" />
        </button>
      </div>
      <div className="grid grid-cols-cardsMobile gap-4 sm:grid-cols-cardsDesktop">
        <SkeletonSearchCard />
      </div>
    </>
  );
}
