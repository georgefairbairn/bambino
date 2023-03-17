export const enum SOCIAL_BUTTON_VARIANTS {
  FACEBOOK = "facebook",
  GOOGLE = "google",
  APPLE = "apple",
}

interface Props {
  children: React.ReactNode;
  variant: SOCIAL_BUTTON_VARIANTS;
  className?: string;
}

export default function SocialButton({
  children,
  className,
  variant,
  ...delegated
}: Props & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  let icon: React.ReactNode;
  let buttonClasses: string;

  switch (variant) {
    case SOCIAL_BUTTON_VARIANTS.FACEBOOK:
      icon = (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mr-3"
        >
          <g clipPath="url(#clip0_106_373)">
            <rect width="24" height="24" fill="#1877F2" />
            <path
              d="M23.5 12.0698C23.5 5.71857 18.3513 0.569849 12 0.569849C5.64872 0.569849 0.5 5.71857 0.5 12.0698C0.5 17.8098 4.70538 22.5674 10.2031 23.4301V15.3941H7.2832V12.0698H10.2031V9.53626C10.2031 6.65407 11.92 5.06204 14.5468 5.06204C15.805 5.06204 17.1211 5.28665 17.1211 5.28665V8.11672H15.671C14.2424 8.11672 13.7969 9.00319 13.7969 9.91263V12.0698H16.9863L16.4765 15.3941H13.7969V23.4301C19.2946 22.5674 23.5 17.8098 23.5 12.0698Z"
              fill="white"
            />
          </g>
          <defs>
            <clipPath id="clip0_106_373">
              <rect width="24" height="24" fill="white" />
            </clipPath>
          </defs>
        </svg>
      );
      buttonClasses = "bg-[#1877F2]";
      break;

    case SOCIAL_BUTTON_VARIANTS.GOOGLE:
      icon = (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mr-3"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M23.04 12.2614C23.04 11.4459 22.9668 10.6618 22.8309 9.90909H12V14.3575H18.1891C17.9225 15.795 17.1123 17.013 15.8943 17.8284V20.7139H19.6109C21.7855 18.7118 23.04 15.7636 23.04 12.2614Z"
            fill="#4285F4"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 23.4998C15.105 23.4998 17.7081 22.4701 19.6109 20.7137L15.8943 17.8282C14.8645 18.5182 13.5472 18.926 12 18.926C9.00474 18.926 6.46951 16.903 5.56519 14.1848H1.72314V17.1644C3.61542 20.9228 7.50451 23.4998 12 23.4998Z"
            fill="#34A853"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M5.56523 14.1851C5.33523 13.4951 5.20455 12.758 5.20455 12.0001C5.20455 11.2421 5.33523 10.5051 5.56523 9.81506V6.83552H1.72318C0.944318 8.38802 0.5 10.1444 0.5 12.0001C0.5 13.8557 0.944318 15.6121 1.72318 17.1646L5.56523 14.1851Z"
            fill="#FBBC05"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 5.07386C13.6884 5.07386 15.2043 5.65409 16.3961 6.79364L19.6945 3.49523C17.7029 1.63955 15.0997 0.5 12 0.5C7.50451 0.5 3.61542 3.07705 1.72314 6.83545L5.56519 9.815C6.46951 7.09682 9.00474 5.07386 12 5.07386Z"
            fill="#EA4335"
          />
        </svg>
      );
      buttonClasses = "text-slate-500";
      break;

    case SOCIAL_BUTTON_VARIANTS.APPLE:
      icon = (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mr-3"
        >
          <rect width="24" height="24" fill="black" />
          <path
            d="M21.2808 18.424C20.933 19.2275 20.5213 19.9672 20.0442 20.6472C19.394 21.5743 18.8616 22.216 18.4513 22.5724C17.8153 23.1573 17.1338 23.4568 16.4041 23.4739C15.8802 23.4739 15.2485 23.3248 14.513 23.0224C13.7752 22.7214 13.0972 22.5724 12.4772 22.5724C11.827 22.5724 11.1296 22.7214 10.3837 23.0224C9.63662 23.3248 9.03481 23.4824 8.57468 23.498C7.87491 23.5278 7.1774 23.2198 6.48118 22.5724C6.03681 22.1848 5.48099 21.5204 4.81515 20.5791C4.10075 19.5739 3.51342 18.4084 3.05329 17.0795C2.56051 15.6442 2.31348 14.2543 2.31348 12.9087C2.31348 11.3673 2.64654 10.0379 3.31366 8.92385C3.83796 8.02901 4.53546 7.32313 5.40844 6.80494C6.28142 6.28674 7.22468 6.02268 8.24048 6.00578C8.7963 6.00578 9.52518 6.17771 10.431 6.5156C11.3342 6.85463 11.9141 7.02655 12.1684 7.02655C12.3585 7.02655 13.0028 6.82552 14.0949 6.42474C15.1278 6.05306 15.9995 5.89916 16.7136 5.95979C18.6487 6.11595 20.1024 6.87876 21.0693 8.25304C19.3386 9.30164 18.4826 10.7703 18.4996 12.6544C18.5152 14.122 19.0476 15.3432 20.0939 16.3129C20.5681 16.7629 21.0977 17.1107 21.6868 17.3578C21.5591 17.7283 21.4242 18.0832 21.2808 18.424V18.424ZM16.8428 0.960138C16.8428 2.1104 16.4226 3.1844 15.5849 4.17848C14.5741 5.36024 13.3514 6.04312 12.0256 5.93537C12.0087 5.79737 11.9989 5.65213 11.9989 5.49952C11.9989 4.39527 12.4796 3.2135 13.3333 2.24725C13.7595 1.75801 14.3015 1.35123 14.9588 1.02672C15.6147 0.70706 16.2352 0.53028 16.8187 0.500008C16.8357 0.65378 16.8428 0.807561 16.8428 0.960123V0.960138Z"
            fill="white"
          />
        </svg>
      );
      buttonClasses = "bg-black";
      break;

    default:
      throw new Error("Variant type does not exist");
  }

  return (
    <button
      className={`flex items-center text-white px-6 py-3 rounded-lg w-fit shadow-lg ${buttonClasses} ${className} sm:text-lg`}
      {...delegated}
    >
      {icon}
      {children}
    </button>
  );
}
