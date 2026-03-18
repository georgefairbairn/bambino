import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';
import { useMutation } from 'convex/react';
import * as Sentry from '@sentry/react-native';
import { api } from '@/convex/_generated/api';

const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? '';
const ENTITLEMENT_ID = 'premium';

let isConfigured = false;

export function usePurchases() {
  const [isPremium, setIsPremium] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const updatePremiumStatus = useMutation(api.users.updatePremiumStatus);

  useEffect(() => {
    async function init() {
      if (!REVENUECAT_API_KEY || isConfigured) {
        setIsLoading(false);
        return;
      }

      try {
        if (__DEV__) {
          Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        }

        if (Platform.OS === 'ios') {
          Purchases.configure({ apiKey: REVENUECAT_API_KEY });
          isConfigured = true;
        }

        const customerInfo = await Purchases.getCustomerInfo();
        checkEntitlement(customerInfo);

        const offerings = await Purchases.getOfferings();
        if (offerings.current?.availablePackages) {
          setPackages(offerings.current.availablePackages);
        }
      } catch (error) {
        Sentry.captureException(error);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  const checkEntitlement = useCallback(
    (customerInfo: CustomerInfo) => {
      const hasPremium =
        customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      setIsPremium(hasPremium);
    },
    [],
  );

  const purchasePremium = useCallback(async () => {
    if (packages.length === 0) return false;

    try {
      const { customerInfo } = await Purchases.purchasePackage(packages[0]);
      const hasPremium =
        customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

      if (hasPremium) {
        setIsPremium(true);
        await updatePremiumStatus({ isPremium: true });
      }

      return hasPremium;
    } catch (error: unknown) {
      const purchaseError = error as { userCancelled?: boolean };
      if (!purchaseError.userCancelled) {
        Sentry.captureException(error);
      }
      return false;
    }
  }, [packages, updatePremiumStatus]);

  const restorePurchases = useCallback(async () => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      const hasPremium =
        customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

      setIsPremium(hasPremium);
      await updatePremiumStatus({ isPremium: hasPremium });

      return hasPremium;
    } catch (error) {
      Sentry.captureException(error);
      return false;
    }
  }, [updatePremiumStatus]);

  return {
    isPremium,
    packages,
    isLoading,
    purchasePremium,
    restorePurchases,
  };
}
