import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

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

  const underlineColor =
    nameIndex % 2 === 0 ? "border-b-pink-500" : "border-b-blue-500";

  return (
    <div className="flex justify-between max-w-4xl mx-auto">
      <div className="flex flex-col justify-end relative overflow-hidden w-[26rem] mr-16">
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
            className={`text-8xl transform-gpu absolute top-0 left-0 block border-b-8 border-solid pb-4 ${underlineColor}`}
          >
            {FEATURED_NAMES[nameIndex]}
          </motion.span>
        </AnimatePresence>
      </div>
      <div>
        <div className="text-2xl flex flex-col justify-center">
          <p className="w-64 mb-7">
            Find the <span className="font-alfaSlab">perfect</span> name for
            your baby
          </p>
          <button className="group flex justify-start items-center bg-black text-white w-fit py-3.5 px-6 rounded-full">
            <span className="mr-2.5">Get started</span>
            <ArrowRight
              size={24}
              className="group-hover:translate-x-2 transition-transform ease-in-out duration-300"
            />
          </button>
        </div>
      </div>
    </div>
  );
}
