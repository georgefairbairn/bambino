import { NamesHeader } from './names-header';

// See liked-names-header.tsx — name_asc/name_desc removed for pagination
// compatibility (#170).
export type RejectedSortOption = 'rejected_newest' | 'rejected_oldest';

const SORT_OPTIONS: { value: RejectedSortOption; label: string }[] = [
  { value: 'rejected_newest', label: 'Recently Rejected' },
  { value: 'rejected_oldest', label: 'Oldest First' },
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
  hideActions?: boolean;
}

export function RejectedNamesHeader(props: RejectedNamesHeaderProps) {
  return <NamesHeader title="Rejected" sortOptions={SORT_OPTIONS} {...props} />;
}
