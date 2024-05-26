import { LoaderFunction, json, redirect } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { db } from '~/utils/db.server';
import { FILTERS, ROUTES } from '~/utils/consts';
import { SelectButton } from '~/components/select-button';
import { useState } from 'react';
import { ArrowLeft, Pencil, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react';

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

  const names = await db.userAction.findMany({
    where: { searchId: parseInt(searchId), NOT: { actionType: 'skip' } },
    include: { name: true },
  });

  return json({ label: searchDetails.label, names });
};

export default function Names() {
  const { label, names } = useLoaderData();
  console.log({ names });

  const [filters, setFilters] = useState({
    [FILTERS.BOY]: true,
    [FILTERS.GIRL]: true,
    [FILTERS.LIKED]: true,
    [FILTERS.DISLIKED]: true,
  });

  const onClickEdit = () => {};
  const onClickDelete = () => {};

  return (
    <div className="flex flex-col mt-8">
      <h1 className="text-2xl font-bold mr-2">{label}</h1>

      <div className="flex justify-between items-start mt-8">
        <Link to={ROUTES.LIBRARY} className="flex group items-center">
          <ArrowLeft
            size={24}
            className="group-hover:-translate-x-2 transition-transform ease-in-out duration-300"
          />
          <span className="ml-2 group-hover:underline underline-offset-8 text-lg">
            Back to Library
          </span>
        </Link>
        <div className="flex flex-col items-end">
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

      <div className="flex w-full text-white bg-black px-5 py-4 rounded-lg mt-6 font-bold">
        <div className="flex flex-1">
          <div className="flex-1">Name</div>
          <div className="flex-1">Gender</div>
          <div className="flex-1">Decision</div>
        </div>
        <div className="min-w-20">Actions</div>
      </div>

      {names.length === 0 ? (
        <div className="flex flex-col w-full items-center mt-12">
          <div className="font-bold">No results found</div>
          <div className="text-slate-500">
            Try adjusting the filters to show more results
          </div>
        </div>
      ) : null}

      {names.map((nameObj: any) => {
        const name = nameObj.name.name;
        let gender;
        if (nameObj.name.gender === 'male') {
          gender = 'Boy';
        } else if (nameObj.name.gender === 'female') {
          gender = 'Girl';
        } else if (nameObj.name.gender === 'unisex') {
          gender = 'Boy / Girl';
        }

        let userAction;
        if (nameObj.actionType === 'like') {
          userAction = 'Liked';
        } else if (nameObj.actionType === 'dislike') {
          userAction = 'Disliked';
        }

        return (
          <div className="flex w-full px-5 py-4 rounded-lg mt-4 bg-white border-4 border-black box-border">
            <div className="flex flex-1">
              <div className="flex-1">{name}</div>
              <div className="flex-1">{gender}</div>
              <div className="flex-1">{userAction}</div>
            </div>
            <div className="min-w-20">
              <button
                className="text-slate-500 mr-6 hover:scale-125 transition"
                type="button"
                onClick={onClickEdit}
              >
                <Pencil />
              </button>
              <button
                className="text-red-500 hover:scale-125 transition"
                type="button"
                onClick={onClickEdit}
              >
                <Trash2 />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
