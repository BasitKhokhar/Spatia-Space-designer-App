import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { REVENUECAT_ANDROID_API_KEY } from '@/constants/config';

// The only file in the app that touches the react-native-purchases SDK
// directly. `ensureConfigured()` is memoized so every export below is safe to
// call from anywhere (RootNavigator's auth effect, PaywallScreen, App.jsx)
// without racing Purchases.configure(). When the API key isn't set yet
// (RevenueCat dashboard not linked to Play Console — see the integration
// plan) every export resolves to a harmless no-op instead of throwing.
let configuredPromise = null;

function ensureConfigured() {
  if (!REVENUECAT_ANDROID_API_KEY) return Promise.resolve(false);
  if (!configuredPromise) {
    configuredPromise = (async () => {
      if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      Purchases.configure({ apiKey: REVENUECAT_ANDROID_API_KEY });
      return true;
    })();
  }
  return configuredPromise;
}

export const initPurchases = () => ensureConfigured();

// Ties RevenueCat's subscriber identity to our own backend user id, so
// webhook/sync events map straight back to a `users` row server-side.
export async function loginRevenueCat(userId) {
  if (!userId || !(await ensureConfigured())) return;
  try {
    await Purchases.logIn(String(userId));
  } catch (e) {
    console.warn('[RevenueCat] logIn failed', e);
  }
}

export async function logoutRevenueCat() {
  if (!(await ensureConfigured())) return;
  try {
    await Purchases.logOut();
  } catch {
    // already anonymous / never logged in — fine
  }
}

export async function getOfferingPackages() {
  if (!(await ensureConfigured())) return [];
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages || [];
  } catch (e) {
    console.warn('[RevenueCat] getOfferings failed', e);
    return [];
  }
}

// Throws { userCancelled: true, ... } when the user dismisses the store sheet
// — callers should check that flag before surfacing an error.
export async function purchasePackage(pkg) {
  await ensureConfigured();
  return Purchases.purchasePackage(pkg);
}

export async function restorePurchases() {
  await ensureConfigured();
  return Purchases.restorePurchases();
}

// Client-side entitlement read, for optimistic UI only — the backend snapshot
// (synced via billingApi.revenueCatSync + the webhook) stays the source of
// truth that gates the catalog (see useCreditsStore).
export async function getActiveEntitlements() {
  if (!(await ensureConfigured())) return [];
  try {
    const info = await Purchases.getCustomerInfo();
    return Object.keys(info.entitlements.active || {});
  } catch (e) {
    console.warn('[RevenueCat] getCustomerInfo failed', e);
    return [];
  }
}
