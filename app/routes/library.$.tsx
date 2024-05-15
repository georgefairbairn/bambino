import SkeletonSearchCard from '~/components/skeleton-search-card';
import { Info } from 'lucide-react';
import { getAuth } from '@clerk/remix/ssr.server';
import { LoaderFunction, redirect, json } from '@remix-run/node';
import { db } from '~/utils/db.server';
import SearchCard from '~/components/search-card';
import { useLoaderData } from '@remix-run/react';
import { Search } from '@prisma/client';

export const loader: LoaderFunction = async args => {
  const { userId } = await getAuth(args);

  if (!userId) {
    return redirect(process.env.CLERK_SIGN_IN_URL ?? '/');
  }

  const acceptLanguage = args.request.headers.get('Accept-Language');
  const locale = acceptLanguage ? acceptLanguage.split(',')[0] : 'en-US';

  try {
    let existingUser = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!existingUser) {
      existingUser = await db.user.create({ data: { clerkUserId: userId } });
    }

    const searches = await db.search.findMany({
      where: { userId: existingUser.id },
      orderBy: { createdAt: 'desc' },
    });

    return json({ searches, locale });
  } catch (error) {
    console.error('Failed to insert or retrieve user:', error);
  }

  return {};
};

export default function Library() {
  const { searches, locale } = useLoaderData();

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
        {searches.map((search: Search) => (
          <SearchCard
            key={search.id}
            id={search.id}
            genderPreference={search.genderPreference}
            label={search.label}
            lastUpdated={search.lastUpdated}
            locale={locale}
          />
        ))}
      </div>
    </>
  );
}
