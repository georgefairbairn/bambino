import { ArrowRight } from "lucide-react";

export default function Index() {
  return (
    <div className="flex pt-5 flex-col">
      <h1 className="text-5xl font-alfaSlab text-center mb-24">bambino</h1>
      <div className="flex justify-around">
        <div className="text-8xl">Penelope</div>
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
