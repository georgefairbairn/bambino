import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import Purchases, { PurchasesPackage, CustomerInfo, LOG_LEVEL } from 'react-native-purchases';
import { useAction } from 'convex/react';
import * as Sentry from '@sentry/react-native';
import { api } from '@/convex/_generated/api';
import { ENTITLEMENT_ID } from '@/constants/purchases';
import { getMetaAnonymousID } from '@/lib/meta';

const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? '';

let isConfigured = false;

/** Resolves once RevenueCat knows who is signed in, so purchases land on their account. */
let identified: Promise<void> = Promise.resolve();

function configurePurchases(): boolean {
  if (isConfigured) return true;
  if (!REVENUECAT_API_KEY || Platform.OS !== 'ios') return false;
  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }
  Purchases.configure({ apiKey: REVENUECAT_API_KEY });
  isConfigured = true;
  return true;
}

/**
 * Logs the purchaser in to RevenueCat as their Clerk id, which is how the
 * webhook and syncPremium find their account. Email and name make them
 * recognisable in RevenueCat's Customers page. The device identifiers and
 * Meta's anonymous id let RevenueCat's Meta integration attribute purchases
 * to ads. Anything bought before sign-in moves to this account.
 */
export function identifyPurchaser(user: { id: string; email?: string; name?: string }) {
  if (!configurePurchases()) return;
  identified = (async () => {
    try {
      await Purchases.logIn(user.id);
      if (user.email) await Purchases.setEmail(user.email);
      if (user.name) await Purchases.setDisplayName(user.name);
      await Purchases.collectDeviceIdentifiers();
      const metaId = await getMetaAnonymousID();
      if (metaId) await Purchases.setFBAnonymousID(metaId);
    } catch (error) {
      Sentry.captureException(error);
    }
  })();
}

/** On sign-out, so the next account on this device doesn't inherit the purchases. */
export async function resetPurchaser() {
  if (!isConfigured) return;
  try {
    // logOut throws for a purchaser who was never logged in.
    if (!(await Purchases.isAnonymous())) await Purchases.logOut();
  } catch (error) {
    Sentry.captureException(error);
  }
}

export function usePurchases() {
  const [isPremium, setIsPremium] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const syncPremium = useAction(api.revenuecat.syncPremium);

  useEffect(() => {
    async function init() {
      if (!configurePurchases()) {
        setIsLoading(false);
        return;
      }

      try {
        await identified;
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
      await identified;
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const hasPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

      if (hasPremium) {
        setIsPremium(true);
        // The server checks with RevenueCat before granting premium.
        await syncPremium();
      }

      return hasPremium;
    } catch (error: unknown) {
      const purchaseError = error as { userCancelled?: boolean };
      if (!purchaseError.userCancelled) {
        Sentry.captureException(error);
      }
      return false;
    }
  }, [packages, syncPremium]);

  const restorePurchases = useCallback(async () => {
    try {
      await identified;
      const customerInfo = await Purchases.restorePurchases();
      const hasPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

      setIsPremium(hasPremium);
      await syncPremium();

      return hasPremium;
    } catch (error) {
      Sentry.captureException(error);
      return false;
    }
  }, [syncPremium]);

  return {
    isPremium,
    packages,
    isLoading,
    purchasePremium,
    restorePurchases,
  };
}
