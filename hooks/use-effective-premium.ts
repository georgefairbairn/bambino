import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export function useEffectivePremium() {
  const status = useQuery(api.premium.getEffectivePremiumStatus);

  return {
    isPremium: status?.isPremium ?? false,
    isOwnPremium: status?.isOwnPremium ?? false,
    isPartnerPremium: status?.isPartnerPremium ?? false,
    partnerName: status?.partnerName,
    gracePeriodEndsAt: status?.gracePeriodEndsAt,
    isLoading: status === undefined,
  };
}
