import { useState } from "react";
import type { MouseEvent } from "react";
import type { ActionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { ArrowRight, Check } from "lucide-react";

import { GENDER, ROUTES } from "~/utils/consts";
import { db } from "~/utils/db.server";

import Button from "~/components/button";
import ButtonLink from "~/components/button-link";
import Input from "~/components/input";

export const action = async ({ request }: ActionArgs) => {
  const form = await request.formData();
  const gender = form.get("gender");
  const label = form.get("label");

  if (typeof gender !== "string" || typeof label !== "string") {
    throw new Error(`Form not submitted correctly.`);
  }

  // TODO: fix once auth flow is worked out
  const user = await db.user.findFirst();

  if (!user) return;

  const fields = {
    gender,
    label,
    userId: user.id,
  };

  const search = await db.search.create({ data: fields });
  return redirect(`${ROUTES.SEARCH}/${search?.id ?? 1}`);
};

function GenderButton({
  gender,
  select,
  isSelected,
}: {
  gender: GENDER.BOY | GENDER.GIRL;
  select: (e: MouseEvent<HTMLButtonElement>) => void;
  isSelected?: boolean;
}) {
  let text = "Boy";
  let icon = "♂";
  let color = "text-blue-500";

  if (gender === GENDER.GIRL) {
    text = "Girl";
    icon = "♀";
    color = "text-pink-500";
  }

  return (
    <button
      onClick={select}
      className="flex justify-between items-center bg-white border-4 border-black box-border rounded-lg w-1/2 sm:w-[9.5rem]"
    >
      <div className="flex items-center flex-1 px-4 py-2">
        <p className="mr-2 font-bold text-lg">{text}</p>
        <p className={`text-5xl ${color} -mt-1`}>{icon}</p>
      </div>

      {isSelected && (
        <div className="flex self-stretch items-center bg-black pl-1.5 pr-0.5">
          <Check size={18} color="white" className="" />
        </div>
      )}
    </button>
  );
}

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
      ? "Boy & Girl Search #1"
      : genderValue === GENDER.BOY
      ? "Boy Search #1"
      : genderValue === GENDER.GIRL
      ? "Girl Search #1"
      : "Search #1";

  const handleGenderSelection = (
    e: MouseEvent<HTMLButtonElement>,
    payload: { [GENDER.BOY]: boolean; [GENDER.GIRL]: boolean }
  ) => {
    e.preventDefault();
    setSelectedGender(payload);
  };

  return (
    <form method="post">
      <h1 className="text-2xl font-bold mt-8 mb-8">New Search</h1>
      <div className="flex flex-col">
        <h2 className="font-bold text-lg">Gender</h2>
        <p className="mb-4">
          Select which gender of names you’d like to see in the search results.
        </p>
        <div className="flex gap-8 mb-8">
          <GenderButton
            gender={GENDER.BOY}
            isSelected={selectedGender[GENDER.BOY]}
            select={(e) =>
              handleGenderSelection(e, {
                [GENDER.GIRL]: selectedGender[GENDER.GIRL],
                [GENDER.BOY]: !selectedGender[GENDER.BOY],
              })
            }
          />
          <GenderButton
            gender={GENDER.GIRL}
            isSelected={selectedGender[GENDER.GIRL]}
            select={(e) =>
              handleGenderSelection(e, {
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
