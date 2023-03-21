import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, Check, Plus, X } from "lucide-react";
import { COMMON_STYLES } from "~/styles/common";
import { GENDER, ROUTES } from "~/utils/consts";
import Input from "./input";
import ButtonLink from "./button-link";

function GenderButton({
  gender,
  select,
  isSelected,
}: {
  gender: GENDER;
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
      className={`flex items-center border-4 border-black rounded-lg ${
        isSelected ? "border-r-[32px]" : ""
      }`}
    >
      <div className="flex items-center flex-1 p-4">
        <p className="mr-2 font-bold text-lg">{text}</p>
        <p className={`text-5xl ${color} -mt-1`}>{icon}</p>
      </div>

      {isSelected && (
        <div className="w-8 -mr-[38px]">
          <Check size={18} color="white" className="" />
        </div>
      )}
    </button>
  );
}

function CreateNewModal({ open, close }: { open: boolean; close: () => void }) {
  const [selected, setSelected] = useState({ boy: true, girl: true });

  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className={COMMON_STYLES.MODAL_OVERLAY} />
        <Dialog.Content
          className={COMMON_STYLES.MODAL_CONTENT}
          onPointerDownOutside={close}
        >
          <Dialog.Title className={COMMON_STYLES.MODAL_TITLE}>
            New Search
          </Dialog.Title>
          <h2 className="font-bold text-lg">Gender</h2>
          <p className="mb-4">
            Select which gender of names you’d like to see in the search
            results.
          </p>
          <div className="grid grid-rows-1 grid-cols-2 gap-4">
            <GenderButton
              gender={GENDER.BOY}
              isSelected={selected.boy}
              select={() => setSelected({ ...selected, boy: !selected.boy })}
            />
            <GenderButton
              gender={GENDER.GIRL}
              isSelected={selected.girl}
              select={() => setSelected({ ...selected, girl: !selected.girl })}
            />
          </div>
          <h2 className="font-bold text-lg mt-8">Label</h2>
          <p className="mb-4">
            Give your search a name so that you can easily find it again later
            (optional).
          </p>
          <Input
            id="label"
            placeholder={
              selected.boy && selected.girl
                ? "Boy & Girl Search #1"
                : selected.boy
                ? "Boy Search #1"
                : selected.girl
                ? "Girl Search #1"
                : "Search #1"
            }
            className="mb-10 sm:w-9/12"
          />
          <div className="flex justify-end items-center">
            <ButtonLink to={`${ROUTES.NAMES}/1`} className="group">
              <span className="mr-2.5">Start</span>
              <ArrowRight
                size={24}
                className="group-hover:translate-x-2 transition-transform ease-in-out duration-300"
              />
            </ButtonLink>
          </div>
          <Dialog.Close asChild className={COMMON_STYLES.MODAL_CLOSE}>
            <button onClick={close} aria-label="Close">
              <X />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function SkeletonSearchCard() {
  const [open, setOpen] = useState(false);

  const onClick = () => {
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
  };

  return (
    <>
      <button
        className="flex justify-center items-center border-dashed border-black border-4 rounded-lg p-8"
        onClick={onClick}
      >
        <span className="mr-2">Create New</span>
        <Plus size={18} />
      </button>
      <CreateNewModal open={open} close={closeModal} />
    </>
  );
}
