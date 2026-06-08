import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import Purchases, { PurchasesPackage, CustomerInfo, LOG_LEVEL } from 'react-native-purchases';
import { useMutation } from 'convex/react';
import * as Sentry from '@sentry/react-native';
import { api } from '@/convex/_generated/api';
import { ENTITLEMENT_ID } from '@/constants/purchases';

const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? '';

let isConfigured = false;

export function usePurchases() {
  const [isPremium, setIsPremium] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const updatePremiumStatus = useMutation(api.users.updatePremiumStatus);

  useEffect(() => {
    async function init() {
      if (!REVENUECAT_API_KEY) {
        setIsLoading(false);
        return;
      }

      try {
        if (!isConfigured && Platform.OS === 'ios') {
          if (__DEV__) {
            Purchases.setLogLevel(LOG_LEVEL.DEBUG);
          }
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

  const checkEntitlement = useCallback((customerInfo: CustomerInfo) => {
    const hasPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    setIsPremium(hasPremium);
  }, []);

  const purchasePremium = useCallback(async () => {
    const pkg = packages[0];
    if (!pkg) return false;

    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const hasPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

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
      const hasPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

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
