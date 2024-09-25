import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Link, useLoaderData, useSearchParams } from '@remix-run/react';
import { db } from '~/utils/db.server';
import { FILTERS, ROUTES } from '~/utils/consts';
import { SelectButton } from '~/components/select-button';
import { useState } from 'react';
import {
  ArrowLeft,
  Eye,
  Pencil,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Blend,
  Check,
  X,
} from 'lucide-react';
import { DialogContent, DialogOverlay } from '@reach/dialog';
import ButtonLink from '~/components/button-link';
import Button from '~/components/button';
import Input from '~/components/input';

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
    filters.includes('boy') ? { gender: 'male' } : undefined,
    filters.includes('girl') ? { gender: 'female' } : undefined,
    { gender: 'unisex' }, // Always include 'unisex'
  ].filter(
    (condition): condition is Exclude<typeof condition, undefined> =>
      condition !== undefined
  );

  // If no gender filters are applied, include all genders
  if (!filters.includes('boy') && !filters.includes('girl')) {
    genderConditions.push({ gender: 'male' }, { gender: 'female' });
  }

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

  return json({
    label: searchDetails.label,
    names,
    searchId,
    isShared: searchDetails.sharedUserId,
  });
};

export const action: ActionFunction = async ({ request }) => {
  try {
    const formData = await request.formData();

    const userActionId = formData.get('userActionId')?.toString();
    const action = formData.get('_action');
    const name = formData.get('name');
    const searchId = formData.get('_searchId');

    if (
      name &&
      searchId &&
      typeof name === 'string' &&
      typeof searchId === 'string'
    ) {
      await db.search.update({
        where: { id: parseInt(searchId) },
        data: { label: name },
      });

      return redirect(request.url);
    }

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
  } catch (error) {
    console.error(error);
  }
};

export default function Names() {
  const { label, names, searchId, isShared } = useLoaderData();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<{ [k: string]: boolean }>({
    [FILTERS.BOY]: false,
    [FILTERS.GIRL]: false,
    [FILTERS.LIKED]: false,
    [FILTERS.DISLIKED]: false,
  });

  const [currentNameObj, setCurrentNameObj] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [searchName, setSearchName] = useState(label);
  const [showEditNameInput, setShowEditNameInput] = useState(false);

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

  const hideNameInput = () => {
    setShowEditNameInput(false);
    setSearchName(label);
  };

  return (
    <div className="flex flex-col my-8">
      <Link
        className="flex group items-center mb-8 sm:hidden"
        to={`${ROUTES.SEARCH}/${searchId}`}
      >
        <ArrowLeft
          size={24}
          className="group-hover:-translate-x-2 transition-transform ease-in-out duration-300"
        />
        <span className="ml-2 group-hover:underline underline-offset-8 text-lg">
          Back
        </span>
      </Link>
      <div className="flex items-center">
        {showEditNameInput ? (
          <form method="post" className="flex">
            <Input
              className="sm:w-9/12 pl-4 pr-4 py-2 border-4 border-black !rounded-lg max-w-xs"
              id="name"
              name="name"
              value={searchName}
              placeholder="Enter a name"
              onChange={e => setSearchName(e.target.value)}
              autoFocus={showEditNameInput}
              required
            />
            <input type="hidden" name="_searchId" value={searchId} />
            <Button type="submit" className="!px-4 mx-2">
              <Check />
            </Button>
            <Button type="button" className="!px-4" onClick={hideNameInput}>
              <X />
            </Button>
          </form>
        ) : (
          <Button
            className="group bg-transparent !text-black !p-0"
            onClick={() => setShowEditNameInput(true)}
          >
            <h1 className="text-2xl font-bold mr-4 group-hover:underline underline-offset-8 decoration-slate-500 decoration-dashed">
              {label}
            </h1>
            <div className="group-hover:block hidden text-slate-500">
              <Pencil />
            </div>
          </Button>
        )}
      </div>
      {!isShared && (
        <div className="flex w-full sm:justify-end mt-8 sm:mt-0">
          <ButtonLink
            to={`${ROUTES.COMPARE}/${searchId}`}
            className="group w-full justify-center sm:w-fit"
          >
            <span className="mr-2.5 text-xl">Compare</span>
            <Blend size={24} />
          </ButtonLink>
        </div>
      )}
      <div className="flex justify-between items-start sm:mt-8">
        <Link
          className="sm:flex group items-center hidden sm:visible"
          to={`${ROUTES.SEARCH}/${searchId}`}
        >
          <ArrowLeft
            size={24}
            className="group-hover:-translate-x-2 transition-transform ease-in-out duration-300"
          />
          <span className="ml-2 group-hover:underline underline-offset-8 text-lg">
            Back
          </span>
        </Link>
        <div className="flex flex-col sm:items-end mt-4 sm:mt-0">
          <div className="text-lg text-slate-500">Filters</div>
          <div className="flex mt-4 gap-4 flex-wrap">
            <SelectButton
              icon={<p className="text-5xl text-blue-500 -mt-1 min-h-12">♂</p>}
              text="Boy"
              isSelected={filters[FILTERS.BOY]}
              onClick={() => toggleFilter(FILTERS.BOY)}
            />
            <SelectButton
              icon={<p className="text-5xl text-pink-500 -mt-1 min-h-12">♀</p>}
              text="Girl"
              isSelected={filters[FILTERS.GIRL]}
              onClick={() => toggleFilter(FILTERS.GIRL)}
            />
            <SelectButton
              icon={<ThumbsUp className="min-h-12" />}
              text="Liked"
              isSelected={filters[FILTERS.LIKED]}
              onClick={() => toggleFilter(FILTERS.LIKED)}
            />
            <SelectButton
              icon={<ThumbsDown className="min-h-12" />}
              text="Disliked"
              isSelected={filters[FILTERS.DISLIKED]}
              onClick={() => toggleFilter(FILTERS.DISLIKED)}
            />
          </div>
        </div>
      </div>

      <div className="w-full grid grid-cols-4 text-white bg-black px-5 py-4 rounded-lg mt-6 font-bold text-sm sm:text-base">
        <div className="flex-1">Name</div>
        <div className="flex-1">Gender</div>
        <div className="flex-1">Decision</div>
        <div className="min-w-20 text-sm sm:text-base">Actions</div>
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
            <div className="w-full grid grid-cols-4 gap-2 text-sm sm:text-base">
              <div className="flex items-center">{name}</div>
              <div className="flex items-center">{gender}</div>
              <div className="flex items-center">{userAction}</div>
              <div className="min-w-20 flex items-center">
                <Link
                  to={`${ROUTES.SEARCH}/${searchId}/${nameObj.name.id}`}
                  className="text-black inline-block mr-2 sm:mr-6 hover:scale-125 transition"
                >
                  <Eye />
                </Link>
                <button
                  className="text-slate-500 mr-2 sm:mr-6 hover:scale-125 transition"
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
              <form method="post">
                <input
                  type="hidden"
                  name="userActionId"
                  value={currentNameObj?.id}
                />
                <input type="hidden" name="_action" value="delete" />

                <h1 className="text-xl font-bold mb-4">Delete Name</h1>
                <p className="mb-8">
                  Are you sure you want to delete this name from your shortlist?
                </p>
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
                    Delete
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
