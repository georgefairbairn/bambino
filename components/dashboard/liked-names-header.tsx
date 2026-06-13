import { NamesHeader } from './names-header';

// Sort options are constrained to those served by the by_user_type index
// so the paginated query (#170) can stream pages in the right order.
// name_asc/name_desc were removed when pagination landed; can re-add via a
// "load all" mode if requested.
export type SortOption = 'liked_newest' | 'liked_oldest';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'liked_newest', label: 'Recently Liked' },
  { value: 'liked_oldest', label: 'Oldest First' },
];

interface LikedNamesHeaderProps {
  count: number;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  selectMode?: boolean;
  onToggleSelectMode?: () => void;
  selectedCount?: number;
  totalCount?: number;
  onSelectAll?: () => void;
  hideActions?: boolean;
}

export function LikedNamesHeader(props: LikedNamesHeaderProps) {
  return <NamesHeader title="Liked" sortOptions={SORT_OPTIONS} {...props} />;
}
