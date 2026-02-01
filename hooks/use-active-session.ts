import { useSessionContext } from '@/contexts/session-context';

export function useActiveSession() {
  return useSessionContext();
}
