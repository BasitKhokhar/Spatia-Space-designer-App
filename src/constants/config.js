export const APP_VERSION = '1.0.0';
export const BUILD_NUMBER = '100';

export const CREDITS = {
  starting: 12, // credits a new account begins with
  perAd: 1, // credits earned per rewarded ad
  dailyAdCap: 5, // max rewarded ads per day
  costs: {
    png: 2,
    pdf: 3,
    obj: 5,
  },
};

// Empty string = use the local-first stub. Set EXPO_PUBLIC_API_BASE_URL (e.g. in
// a .env at the project root, or via EAS) to attach the real backend, e.g.
//   EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:5004   (Android emulator -> host)
//   EXPO_PUBLIC_API_BASE_URL=https://api.homedesigner.app
// Trailing slash is stripped: every caller passes a leading-slash path, so a
// base of ".../" would produce "//auth/users/login" — which some proxies pass
// through verbatim and Express then fails to route.
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  process.env.API_BASE_URL ||
  ''
).replace(/\/+$/, '');

// RevenueCat Android public SDK key. Empty until the RevenueCat dashboard is
// linked to Play Console — see src/services/billing/revenueCat.js.
export const REVENUECAT_ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || '';
