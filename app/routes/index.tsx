import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { AUTH_STATUS, ROUTES } from "~/utils/consts";
import ButtonLink from "~/components/button-link";

const FEATURED_NAMES = [
  "Penelope",
  "Akshay",
  "Wendy",
  "Pablo",
  "Jennifer",
  "Dave",
];

export default function Index() {
  const [nameIndex, setNameIndex] = useState(0);

  useEffect(() => {
    const timeout: NodeJS.Timeout = setTimeout(() => {
      if (nameIndex < 5) {
        setNameIndex(nameIndex + 1);
      } else {
        setNameIndex(0);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [nameIndex]);

  const authStatus = AUTH_STATUS.SIGNED_OUT;

  const redirectUrl =
    authStatus === AUTH_STATUS.SIGNED_OUT
      ? `${ROUTES.LIBRARY}${ROUTES.SIGNIN}`
      : ROUTES.LIBRARY;

  const underlineColor =
    nameIndex % 2 === 0 ? "border-b-pink-500" : "border-b-blue-500";

  return (
    <div className="flex flex-col sm:flex-row sm:max-w-4xl sm:justify-between sm:mx-auto">
      <div className="flex flex-col justify-end relative h-24 mb-8 overflow-hidden sm:w-[26rem] sm:h-auto sm:mr-16 sm:mb-0">
        <AnimatePresence initial={false}>
          <motion.span
            key={`name-${nameIndex}`}
            initial={{
              y: "9rem",
              opacity: 0.5,
            }}
            animate={{
              y: 0,
              opacity: 1,
            }}
            exit={{ y: "-9rem", opacity: 0 }}
            transition={{ duration: 1 }}
            className={`text-6xl transform-gpu absolute top-0 left-0 block border-b-8 border-solid pb-4 ${underlineColor} sm:text-8xl`}
          >
            {FEATURED_NAMES[nameIndex]}
          </motion.span>
        </AnimatePresence>
      </div>
      <div>
        <div className="flex flex-col justify-center">
          <p className="w-10/12 sm:w-64 mb-4 sm:mb-7 text-2xl">
            Find the <span className="font-alfaSlab">perfect</span> name for
            your baby
          </p>
          <ButtonLink to={redirectUrl} className="group">
            <span className="mr-2.5 text-2xl">Get started</span>
            <ArrowRight
              size={24}
              className="group-hover:translate-x-2 transition-transform ease-in-out duration-300"
            />
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
