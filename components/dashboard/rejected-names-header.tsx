import { NamesHeader } from './names-header';

export type RejectedSortOption = 'name_asc' | 'name_desc' | 'rejected_newest' | 'rejected_oldest';

const SORT_OPTIONS: { value: RejectedSortOption; label: string }[] = [
  { value: 'rejected_newest', label: 'Recently Rejected' },
  { value: 'rejected_oldest', label: 'Oldest First' },
  { value: 'name_asc', label: 'Name A-Z' },
  { value: 'name_desc', label: 'Name Z-A' },
];

interface RejectedNamesHeaderProps {
  count: number;
  sortBy: RejectedSortOption;
  onSortChange: (sort: RejectedSortOption) => void;
  selectMode?: boolean;
  onToggleSelectMode?: () => void;
  selectedCount?: number;
  totalCount?: number;
  onSelectAll?: () => void;
}

export function RejectedNamesHeader(props: RejectedNamesHeaderProps) {
  return <NamesHeader title="Rejected" sortOptions={SORT_OPTIONS} {...props} />;
}
