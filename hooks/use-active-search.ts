import { useSearchContext } from '@/contexts/search-context';

export function useActiveSearch() {
  return useSearchContext();
}
