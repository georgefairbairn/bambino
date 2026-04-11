import { NamesHeader } from './names-header';

export type SortOption = 'name_asc' | 'name_desc' | 'liked_newest' | 'liked_oldest';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'liked_newest', label: 'Recently Liked' },
  { value: 'liked_oldest', label: 'Oldest First' },
  { value: 'name_asc', label: 'Name A-Z' },
  { value: 'name_desc', label: 'Name Z-A' },
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
}

export function LikedNamesHeader(props: LikedNamesHeaderProps) {
  return <NamesHeader title="Liked" sortOptions={SORT_OPTIONS} {...props} />;
}
