import { ArrowRight, Check } from "lucide-react";
import { useMemo, useState } from "react";
import ButtonLink from "~/components/button-link";
import Input from "~/components/input";
import { GENDER, ROUTES } from "~/utils/consts";

function GenderButton({
  gender,
  select,
  isSelected,
}: {
  gender: GENDER.BOY | GENDER.GIRL;
  select: () => void;
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

  const genderValue = useMemo(() => {
    if (selectedGender[GENDER.BOY] && selectedGender[GENDER.GIRL]) {
      return GENDER.BOTH;
    } else if (!selectedGender[GENDER.BOY] && !selectedGender[GENDER.GIRL]) {
      return GENDER.NONE;
    } else if (!selectedGender[GENDER.BOY] && selectedGender[GENDER.GIRL]) {
      return GENDER.GIRL;
    } else {
      return GENDER.BOY;
    }
  }, [selectedGender]);

  return (
    <>
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
            select={() =>
              setSelectedGender({
                [GENDER.GIRL]: selectedGender[GENDER.GIRL],
                [GENDER.BOY]: !selectedGender[GENDER.BOY],
              })
            }
          />
          <GenderButton
            gender={GENDER.GIRL}
            isSelected={selectedGender[GENDER.GIRL]}
            select={() =>
              setSelectedGender({
                [GENDER.BOY]: selectedGender[GENDER.BOY],
                [GENDER.GIRL]: !selectedGender[GENDER.GIRL],
              })
            }
          />
        </div>
        <input type="hidden" name="boy" value={genderValue} />
        <h2 className="font-bold text-lg">Label</h2>
        <p className="mb-4">
          Give your search a name so that you can easily find it again later
          (optional).
        </p>
        <Input
          className="mb-16 sm:w-9/12 pl-4 pr-4 py-2 border-4 border-black !rounded-lg max-w-xs"
          id="label"
          defaultValue={
            genderValue === GENDER.BOTH
              ? "Boy & Girl Search #1"
              : genderValue === GENDER.BOY
              ? "Boy Search #1"
              : genderValue === GENDER.GIRL
              ? "Girl Search #1"
              : "Search #1"
          }
        />
        <div className="grid grid-rows-1 grid-cols-2 sm:grid-cols-3">
          <ButtonLink to={`${ROUTES.NAMES}/1`} className="group">
            <span className="mr-2.5">Start</span>
            <ArrowRight
              size={24}
              className="group-hover:translate-x-2 transition-transform ease-in-out duration-300"
            />
          </ButtonLink>
          <ButtonLink
            className="bg-transparent text-black justify-self-end sm:justify-self-center"
            to={ROUTES.LIBRARY}
          >
            Cancel
          </ButtonLink>
        </div>
      </div>
    </>
  );
}
