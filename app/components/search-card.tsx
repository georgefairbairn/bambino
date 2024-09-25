import type { Search } from '@prisma/client';
import { Link } from '@remix-run/react';
import { Blend } from 'lucide-react';
import { ROUTES } from '~/utils/consts';

export default function SearchCard({
  id,
  label,
  genderPreference,
  lastUpdated,
  locale,
  isShared,
}: {
  id: Search['id'];
  label: Search['label'];
  genderPreference: Search['genderPreference'];
  lastUpdated: string;
  locale: string;
  isShared: boolean;
}) {
  const readableDate = new Date(lastUpdated ?? 0).toLocaleDateString(locale, {
    year: '2-digit',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <Link
      className="flex flex-col border-black border-4 rounded-lg p-8 bg-white"
      to={`${ROUTES.SEARCH}/${id}`}
    >
      <div className="flex items-center justify-between -mt-4">
        <div className="flex-1">
          <span className="font-bold break-all">
            {label}
            {isShared && (
              <div className="bg-black text-white p-1 ml-2 rounded w-fit inline-flex">
                <Blend size={16} />
              </div>
            )}
          </span>
        </div>
        <div>
          {genderPreference !== 'girl' && (
            <span className="text-5xl text-blue-500">♂</span>
          )}
          {genderPreference !== 'boy' && (
            <span className="text-5xl text-pink-500">♀</span>
          )}
        </div>
      </div>
      <span className="text-sm text-slate-500 mt-4">{`Last updated: ${readableDate}`}</span>
    </Link>
  );
}
