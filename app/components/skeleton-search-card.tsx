import { Plus } from "lucide-react";

export default function SkeletonSearchCard() {
  return (
    <button className="flex justify-center items-center border-dashed border-black border-4 rounded-lg p-8">
      <span className="mr-2">Create New</span>
      <Plus size={18} />
    </button>
  );
}
