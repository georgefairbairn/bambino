import { useEffect, useState } from "react";
import { useSearchParams } from "@remix-run/react";
import Auth from "~/components/auth";

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
      <div>Library</div>
      {searchParams.get("signin") && <Auth open={open} close={closeAuth} />}
    </>
  );
}
