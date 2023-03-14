import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ArrowLeftIcon } from "lucide-react";
import Button from "./button";
import { AUTH_STATUS, SIGNED_OUT_STATUS } from "~/utils/consts";
import Input from "./input";
import SocialButton, { SOCIAL_BUTTON_VARIANTS } from "./social-button";

interface Props {
  open: boolean;
  close: () => void;
}

const enum STYLES {
  OVERLAY = "bg-black bg-opacity-40 fixed inset-0",
  CONTENT = "fixed top-1/2 left-1/2 max-h-[95vh] w-[90vw] max-w-[70vw] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-9 border-4 border-black drop-shadow-2xl overflow-auto",
}

export default function Auth({ open, close }: Props) {
  const [authStatus, setAuthStatus] = useState({
    status: AUTH_STATUS.SIGNED_OUT,
    subStatus: SIGNED_OUT_STATUS.UNDETERMINED,
  });

  const handleStatusSelection = (subStatus: SIGNED_OUT_STATUS) => {
    setAuthStatus({ ...authStatus, subStatus });
  };

  const handleBack = () => {
    setAuthStatus({ ...authStatus, subStatus: SIGNED_OUT_STATUS.UNDETERMINED });
  };

  // TODO: Add password reset functionality
  const handleResetPassword = () => {};

  // TODO: Add sign in functionality
  const handleSignIn = () => {};

  // TODO: Add sign up functionality
  const handleSignUp = () => {};

  const renderGetStarted = () => (
    <>
      <Dialog.Title className="text-center text-4xl font-bold mb-10">
        Get started
      </Dialog.Title>
      <div className="flex justify-around">
        <div className="flex justify-center w-full py-20 border-r-4 border-black">
          <Button
            onClick={() => handleStatusSelection(SIGNED_OUT_STATUS.NEW_USER)}
          >
            I'm a new user
          </Button>
        </div>
        <div className="flex justify-center w-full py-20">
          <Button
            onClick={() => handleStatusSelection(SIGNED_OUT_STATUS.HAS_ACCOUNT)}
          >
            I have an account
          </Button>
        </div>
      </div>
    </>
  );

  const renderForm = ({
    type,
  }: {
    type: Exclude<SIGNED_OUT_STATUS, SIGNED_OUT_STATUS.UNDETERMINED>;
  }) => {
    let title = "";
    let actionText = "";
    let action = handleSignUp;
    let altCopy = <></>;
    let altActionText = "";
    let altAction = close;

    switch (type) {
      case SIGNED_OUT_STATUS.HAS_ACCOUNT:
        title = "I have an account";
        actionText = "Sign In";
        action = handleSignIn;
        altCopy = (
          <p className="text-center">
            <span className="line-through">Forgotten</span> Want to change your
            password?
          </p>
        );
        altActionText = "Reset password";
        altAction = handleResetPassword;
        break;

      case SIGNED_OUT_STATUS.NEW_USER:
        title = "I'm a new user";
        actionText = "Sign Up";
        altCopy = (
          <>
            <p className="text-center">
              Want to take it for a spin before you sign up? No problem.
            </p>
            <p className="text-center">
              You can always create an account later.
            </p>
          </>
        );
        altActionText = "Get started without an account";
        break;

      default:
        break;
    }

    return (
      <>
        <Dialog.Title className="text-center text-4xl font-bold mb-10">
          <div className="flex justify-between">
            <button onClick={handleBack} aria-label="Back">
              <ArrowLeftIcon />
            </button>
            {title}
            <div></div>
          </div>
        </Dialog.Title>
        <div className="flex justify-between">
          <div className="flex flex-col justify-start w-full border-r-4 border-black">
            <Input
              autoFocus
              id="email"
              placeholder="Email"
              className="w-9/12 mb-6"
            />
            <Input
              id="password"
              placeholder="Password"
              className="w-9/12 mb-6"
            />
            <Button onClick={action}>{actionText}</Button>
          </div>
          <div className="flex flex-col justify-start items-end w-full">
            <SocialButton
              variant={SOCIAL_BUTTON_VARIANTS.FACEBOOK}
              className="mb-6 w-10/12"
            >
              {`${actionText} with Facebook`}
            </SocialButton>
            <SocialButton
              variant={SOCIAL_BUTTON_VARIANTS.GOOGLE}
              className="mb-6 w-10/12"
            >
              {`${actionText} with Google`}
            </SocialButton>
            <SocialButton
              variant={SOCIAL_BUTTON_VARIANTS.APPLE}
              className="w-10/12"
            >
              {`${actionText} with Apple`}
            </SocialButton>
          </div>
        </div>
        <div className="flex flex-col items-center max-w-xl mt-12 m-auto">
          {altCopy}
          <Button className="mt-4" onClick={altAction}>
            {altActionText}
          </Button>
        </div>
      </>
    );
  };

  const renderContent = () => {
    let content: React.ReactNode;

    switch (authStatus.subStatus) {
      case SIGNED_OUT_STATUS.UNDETERMINED:
        content = renderGetStarted();
        break;

      case SIGNED_OUT_STATUS.HAS_ACCOUNT:
        content = renderForm({ type: SIGNED_OUT_STATUS.HAS_ACCOUNT });
        break;

      case SIGNED_OUT_STATUS.NEW_USER:
        content = renderForm({ type: SIGNED_OUT_STATUS.NEW_USER });
        break;

      default:
        break;
    }

    return content;
  };

  // prevent modal render if already signed in
  if (authStatus.status === AUTH_STATUS.SIGNED_IN) {
    // TODO: auto remove query params for modal
    return null;
  }

  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className={STYLES.OVERLAY} />
        <Dialog.Content className={STYLES.CONTENT} onPointerDownOutside={close}>
          <>
            {renderContent()}
            <Dialog.Close asChild className="absolute top-4 right-4">
              <button onClick={close} aria-label="Close">
                <X />
              </button>
            </Dialog.Close>
          </>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
