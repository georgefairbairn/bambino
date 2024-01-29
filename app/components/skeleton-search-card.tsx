import { Link } from '@remix-run/react';
import { Plus } from 'lucide-react';
import { ROUTES } from '~/utils/consts';

export default function SkeletonSearchCard() {
  return (
    <Link
      className="flex justify-center items-center border-dashed border-black border-4 rounded-lg p-8"
      to={ROUTES.NEW_SEARCH}
    >
      <span className="mr-2">Create New</span>
      <Plus size={18} />
    </Link>
  );
}
