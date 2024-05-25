import { LoaderFunction, json, redirect } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { db } from '~/utils/db.server';
import { FILTERS, ROUTES } from '~/utils/consts';
import { SelectButton } from '~/components/select-button';
import { useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';

export const loader: LoaderFunction = async ({ params }) => {
  console.log({ params });
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

  return json({ label: searchDetails.label });
};

export default function Names() {
  const { label } = useLoaderData();

  const [filters, setFilters] = useState({
    [FILTERS.BOY]: true,
    [FILTERS.GIRL]: true,
    [FILTERS.LIKED]: true,
    [FILTERS.DISLIKED]: true,
  });

  return (
    <div className="flex flex-col mt-8">
      <h1 className="text-2xl font-bold mr-2">{label}</h1>
      <div className="flex flex-col w-full items-end">
        <div className="text-lg text-slate-500">Filters</div>
        <div className="flex mt-4 gap-4">
          <SelectButton
            icon={<p className="text-5xl text-blue-500 -mt-1">♂</p>}
            text="Boy"
            isSelected={filters[FILTERS.BOY]}
            onClick={() =>
              setFilters({
                ...filters,
                [FILTERS.BOY]: !filters[FILTERS.BOY],
              })
            }
          />
          <SelectButton
            icon={<p className="text-5xl text-pink-500 -mt-1">♀</p>}
            text="Girl"
            isSelected={filters[FILTERS.GIRL]}
            onClick={() =>
              setFilters({
                ...filters,
                [FILTERS.GIRL]: !filters[FILTERS.GIRL],
              })
            }
          />
          <SelectButton
            icon={<ThumbsUp />}
            text="Liked"
            isSelected={filters[FILTERS.LIKED]}
            onClick={() =>
              setFilters({
                ...filters,
                [FILTERS.LIKED]: !filters[FILTERS.LIKED],
              })
            }
          />
          <SelectButton
            icon={<ThumbsDown />}
            text="Disliked"
            isSelected={filters[FILTERS.DISLIKED]}
            onClick={() =>
              setFilters({
                ...filters,
                [FILTERS.DISLIKED]: !filters[FILTERS.DISLIKED],
              })
            }
          />
        </div>
      </div>
    </div>
  );
}
