import {
  ActionFunction,
  LoaderFunction,
  json,
  redirect,
} from '@remix-run/node';
import {
  Link,
  useLoaderData,
  useFetcher,
  useSearchParams,
} from '@remix-run/react';
import { db } from '~/utils/db.server';
import { FILTERS, ROUTES } from '~/utils/consts';
import { SelectButton } from '~/components/select-button';
import { useState } from 'react';
import { ArrowLeft, Pencil, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react';
import { DialogContent, DialogOverlay } from '@reach/dialog';

export const loader: LoaderFunction = async ({ request, params }) => {
  const url = new URL(request.url);
  const filters = url.searchParams.getAll('filter');

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

  const genderConditions = [
    !filters.length || filters.includes('boy') ? { gender: 'male' } : undefined,
    !filters.length || filters.includes('girl')
      ? { gender: 'female' }
      : undefined,
    { gender: 'unisex' },
  ].filter(
    (condition): condition is Exclude<typeof condition, undefined> =>
      condition !== undefined
  );

  const actionTypeConditions = [
    !filters.length || filters.includes('liked')
      ? { actionType: 'like' }
      : undefined,
    !filters.length || filters.includes('disliked')
      ? { actionType: 'dislike' }
      : undefined,
  ].filter(
    (condition): condition is Exclude<typeof condition, undefined> =>
      condition !== undefined
  );

  const names = await db.userAction.findMany({
    where: {
      searchId: parseInt(searchId),
      AND: [
        { name: { OR: genderConditions } },
        { OR: actionTypeConditions.length ? actionTypeConditions : undefined },
        { actionType: { not: 'skip' } },
      ],
    },
    include: { name: true },
  });

  return json({ label: searchDetails.label, names });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const userActionId = formData.get('userActionId')?.toString();
  const action = formData.get('_action');

  if (action === 'delete' && userActionId) {
    await db.userAction.delete({
      where: { id: parseInt(userActionId) },
    });

    return redirect(request.url);
  }

  if (action === 'edit' && userActionId) {
    await db.userAction.delete({
      where: { id: parseInt(userActionId) },
    });

    return redirect(request.url);
  }

  if ((action === 'like' || action === 'dislike') && userActionId) {
    await db.userAction.update({
      where: { id: parseInt(userActionId) },
      data: { actionType: action },
    });

    return redirect(request.url);
  }

  return json({ ok: true });
};

export default function Names() {
  const [_, setSearchParams] = useSearchParams();
  const { label, names } = useLoaderData();

  const [filters, setFilters] = useState<{ [k: string]: boolean }>({
    [FILTERS.BOY]: true,
    [FILTERS.GIRL]: true,
    [FILTERS.LIKED]: true,
    [FILTERS.DISLIKED]: true,
  });

  const [currentNameObj, setCurrentNameObj] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const openDeleteDialog = (nameObj: any) => {
    setCurrentNameObj(nameObj);
    setShowDeleteDialog(true);
  };
  const closeDeleteDialog = () => {
    setCurrentNameObj(null);
    setShowDeleteDialog(false);
  };

  const openEditDialog = (nameObj: any) => {
    setCurrentNameObj(nameObj);
    setShowEditDialog(true);
  };
  const closeEditDialog = () => {
    setCurrentNameObj(null);
    setShowEditDialog(false);
  };

  const toggleFilter = (filter: FILTERS) => {
    const newFilters = {
      ...filters,
      [filter]: !filters[filter],
    };

    setFilters(newFilters);

    const query = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) query.append('filter', key);
    });

    setSearchParams(query); // Update URL with current filters
  };

  return (
    <div className="flex flex-col my-8">
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
              disabled={!filters[FILTERS.GIRL]}
              icon={<p className="text-5xl text-blue-500 -mt-1">♂</p>}
              text="Boy"
              isSelected={filters[FILTERS.BOY]}
              onClick={() => toggleFilter(FILTERS.BOY)}
            />
            <SelectButton
              disabled={!filters[FILTERS.BOY]}
              icon={<p className="text-5xl text-pink-500 -mt-1">♀</p>}
              text="Girl"
              isSelected={filters[FILTERS.GIRL]}
              onClick={() => toggleFilter(FILTERS.GIRL)}
            />
            <SelectButton
              disabled={!filters[FILTERS.DISLIKED]}
              icon={<ThumbsUp />}
              text="Liked"
              isSelected={filters[FILTERS.LIKED]}
              onClick={() => toggleFilter(FILTERS.LIKED)}
            />
            <SelectButton
              disabled={!filters[FILTERS.LIKED]}
              icon={<ThumbsDown />}
              text="Disliked"
              isSelected={filters[FILTERS.DISLIKED]}
              onClick={() => toggleFilter(FILTERS.DISLIKED)}
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
          <div
            className="flex w-full px-5 py-3 rounded-lg mt-4 bg-white border-4 border-black box-border"
            key={nameObj.id}
          >
            <div className="flex flex-1 items-center">
              <div className="flex-1">{name}</div>
              <div className="flex-1">{gender}</div>
              <div className="flex-1">{userAction}</div>
            </div>
            <div className="min-w-20">
              <button
                className="text-slate-500 mr-6 hover:scale-125 transition"
                type="button"
                onClick={() => openEditDialog(nameObj)}
              >
                <Pencil />
              </button>
              <button
                type="button"
                className="text-red-500 hover:scale-125 transition"
                onClick={() => openDeleteDialog(nameObj)}
              >
                <Trash2 />
              </button>
            </div>
          </div>
        );
      })}

      {currentNameObj && (
        <>
          <DialogOverlay
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
            isOpen={showDeleteDialog}
            onDismiss={closeDeleteDialog}
          >
            <DialogContent className="flex flex-col px-5 py-3 rounded-lg mt-4 bg-white border-4 border-black box-border">
              <h1 className="text-xl font-bold mb-4">{}</h1>
              <p className="mb-8">Are you sure you want to delete this item?</p>
              <form method="post">
                <input
                  type="hidden"
                  name="userActionId"
                  value={currentNameObj?.id}
                />
                <input type="hidden" name="_action" value="delete" />

                <div className="flex justify-end">
                  <button
                    className="mr-2 px-4 py-2 bg-gray-200 rounded-lg"
                    onClick={closeDeleteDialog}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 bg-red-500 text-white rounded-lg"
                    type="submit"
                  >
                    Confirm
                  </button>
                </div>
              </form>
            </DialogContent>
          </DialogOverlay>

          <DialogOverlay
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
            isOpen={showEditDialog}
            onDismiss={closeEditDialog}
          >
            <DialogContent className="flex flex-col px-5 py-3 rounded-lg mt-4 bg-white border-4 border-black box-border">
              <h1 className="text-xl font-bold mb-4">
                {currentNameObj.name.name}
              </h1>
              <p className="mb-4">
                You've currently{' '}
                <span className="font-bold">{`${currentNameObj.actionType}d`}</span>{' '}
                this name.
              </p>
              <p className="mb-8">
                Do you want to change your selection to{' '}
                <span className="font-bold">{`${currentNameObj.actionType === 'dislike' ? 'like' : 'dislike'}`}</span>
                ?
              </p>
              <form method="post">
                <input
                  type="hidden"
                  name="userActionId"
                  value={currentNameObj.id}
                />
                <input
                  type="hidden"
                  name="_action"
                  value={
                    currentNameObj.actionType === 'dislike' ? 'like' : 'dislike'
                  }
                />

                <div className="flex justify-end">
                  <button
                    className="mr-2 px-4 py-2 bg-gray-200 rounded-lg"
                    onClick={closeEditDialog}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 bg-black text-white rounded-lg"
                    type="submit"
                  >
                    Confirm
                  </button>
                </div>
              </form>
            </DialogContent>
          </DialogOverlay>
        </>
      )}
    </div>
  );
}
