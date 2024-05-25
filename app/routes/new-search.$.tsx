import { useState } from 'react';
import type { MouseEvent } from 'react';
import type { ActionArgs } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import { ArrowRight, Check } from 'lucide-react';
import { getAuth } from '@clerk/remix/ssr.server';

import { GENDER, ROUTES } from '~/utils/consts';
import { db } from '~/utils/db.server';

import Button from '~/components/button';
import ButtonLink from '~/components/button-link';
import Input from '~/components/input';
import { SelectButton } from '~/components/select-button';

export const action = async (args: ActionArgs) => {
  try {
    const { userId: clerkUserId } = await getAuth(args);

    const form = await args.request.formData();
    const genderPreference = form.get('gender');
    const label = form.get('label');

    if (
      typeof genderPreference !== 'string' ||
      typeof label !== 'string' ||
      typeof clerkUserId !== 'string'
    ) {
      throw new Error(`Form not submitted correctly.`);
    }

    const user = await db.user.findUnique({ where: { clerkUserId } });

    if (!user) return redirect(ROUTES.LIBRARY);

    const search = await db.search.create({
      data: { userId: user.id, genderPreference, label },
    });

    if (!search.id) return redirect(ROUTES.LIBRARY);

    return redirect(`${ROUTES.SEARCH}/${search.id}`);
  } catch (error) {
    console.error('Failed to create search:', error);
  }
};

export default function NewSearch() {
  const [selectedGender, setSelectedGender] = useState({
    [GENDER.BOY]: true,
    [GENDER.GIRL]: true,
  });

  const genderValue =
    selectedGender[GENDER.BOY] && selectedGender[GENDER.GIRL]
      ? GENDER.BOTH
      : !selectedGender[GENDER.BOY] && !selectedGender[GENDER.GIRL]
        ? GENDER.NONE
        : !selectedGender[GENDER.BOY] && selectedGender[GENDER.GIRL]
          ? GENDER.GIRL
          : GENDER.BOY;

  const labelValue =
    genderValue === GENDER.BOTH
      ? 'Boy & Girl Search #1'
      : genderValue === GENDER.BOY
        ? 'Boy Search #1'
        : genderValue === GENDER.GIRL
          ? 'Girl Search #1'
          : 'Search #1';

  return (
    <form method="post">
      <h1 className="text-2xl font-bold mt-8 mb-8">New Search</h1>
      <div className="flex flex-col">
        <h2 className="font-bold text-lg">Gender</h2>
        <p className="mb-4">
          Select which gender of names you’d like to see in the search results.
        </p>
        <div className="flex gap-8 mb-8">
          <SelectButton
            icon={<p className="text-5xl text-blue-500 -mt-1">♂</p>}
            text="Boy"
            isSelected={selectedGender[GENDER.BOY]}
            onClick={() =>
              setSelectedGender({
                [GENDER.GIRL]: selectedGender[GENDER.GIRL],
                [GENDER.BOY]: !selectedGender[GENDER.BOY],
              })
            }
          />
          <SelectButton
            icon={<p className="text-5xl text-pink-500 -mt-1">♀</p>}
            text="Girl"
            isSelected={selectedGender[GENDER.GIRL]}
            onClick={() =>
              setSelectedGender({
                [GENDER.BOY]: selectedGender[GENDER.BOY],
                [GENDER.GIRL]: !selectedGender[GENDER.GIRL],
              })
            }
          />
        </div>
        <input type="hidden" name="gender" value={genderValue} required />
        <h2 className="font-bold text-lg">Label</h2>
        <p className="mb-4">
          Give your search a name so that you can easily find it again later
          (optional).
        </p>
        <Input
          className="mb-16 sm:w-9/12 pl-4 pr-4 py-2 border-4 border-black !rounded-lg max-w-xs"
          key={genderValue}
          id="label"
          name="label"
          defaultValue={labelValue}
          required
        />
        <div className="grid grid-rows-1 grid-cols-2 sm:grid-cols-3">
          <Button type="submit" className="group">
            <span className="mr-2.5">Start</span>
            <ArrowRight
              size={24}
              className="group-hover:translate-x-2 transition-transform ease-in-out duration-300"
            />
          </Button>
          <ButtonLink
            className="bg-transparent text-black justify-self-end sm:justify-self-center"
            to={ROUTES.LIBRARY}
          >
            Cancel
          </ButtonLink>
        </div>
      </div>
    </form>
  );
}
