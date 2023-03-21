import { useEffect, useState } from "react";
import { useSearchParams } from "@remix-run/react";
import Auth from "~/components/auth";
import SkeletonSearchCard from "~/components/skeleton-search-card";
import { Info } from "lucide-react";

export default function Library() {
  const [open, setOpen] = useState(false);
  const [searchParams] = useSearchParams();

  // prevent hydration errors rendering Radix UI components with SSR
  useEffect(() => {
    setOpen(true);
  }, []);

  const closeAuth = () => {
    setOpen(false);
  };

  return (
    <>
      <div className="flex items-center mt-8 mb-4">
        <h1 className="text-2xl font-bold mr-2">Searches</h1>
        {/* TODO: Add tooltip/modal to explain what Searches is */}
        <button>
          <Info size={18} className="mt-0.5" />
        </button>
      </div>
      <div className="grid grid-cols-cardsMobile gap-4 sm:grid-cols-cardsDesktop">
        <SkeletonSearchCard />
      </div>
      {searchParams.get("signin") && <Auth open={open} close={closeAuth} />}
    </>
  );
}
