import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Plus, X } from "lucide-react";
import { COMMON_STYLES } from "~/styles/common";
import { GENDER } from "~/utils/consts";

function GenderButton({
  gender,
  select,
  isSelected,
}: {
  gender: GENDER;
  select: () => void;
  isSelected?: boolean;
}) {
  let text = "Both";
  let icon = "⚥";
  let size = "4xl";
  let textColor = "text-black";

  switch (gender) {
    case GENDER.BOY:
      text = "Boy";
      icon = "♂";
      size = "5xl";
      textColor = "text-blue-500";
      break;

    case GENDER.GIRL:
      text = "Girl";
      icon = "♀";
      size = "5xl";
      textColor = "text-pink-500";
      break;

    default:
      break;
  }

  return (
    <button
      onClick={select}
      className={`flex items-center border-4 border-black rounded-lg ${
        isSelected ? "border-r-[32px]" : ""
      }`}
    >
      <div className="flex items-center flex-1 p-4">
        <p className="mr-2 font-bold">{text}</p>
        <p className={`text-${size} ${textColor} -mt-2`}>{icon}</p>
      </div>

      {isSelected && gender !== GENDER.BOTH && (
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
          <h2 className="font-bold">Gender</h2>
          <p className="mb-4">
            Select which gender of names you’d like to see in the search
            results.
          </p>
          <div className="grid gap-4">
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
            <GenderButton
              gender={GENDER.BOTH}
              select={() =>
                setSelected({ girl: !selected.girl, boy: !selected.boy })
              }
            />
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
