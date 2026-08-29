import Constants from 'expo-constants';

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

// Empty string = use the local-first stub. Set the backend URL via a .env at
// the project root or as an EAS environment variable, e.g.
//   EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:5004   (Android emulator -> host)
//   EXPO_PUBLIC_API_BASE_URL=https://api.homedesigner.app
//
// Resolution order matters. Metro only inlines EXPO_PUBLIC_-prefixed vars into
// the bundle, so a bare `API_BASE_URL` set on EAS is invisible here at runtime
// — reading it from process.env below would silently yield '' and drop the app
// into local-first mode with no backend. app.config.js therefore also threads
// whichever name is set into `extra.apiBaseUrl` (it runs in Node at build time,
// where both names are visible), and that is the fallback that actually
// carries an unprefixed EAS value through.
//
// Trailing slash is stripped: every caller passes a leading-slash path, so a
// base of ".../" would produce "//auth/users/login" — which some proxies pass
// through verbatim and Express then fails to route.
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  process.env.API_BASE_URL ||
  Constants.expoConfig?.extra?.apiBaseUrl ||
  ''
).replace(/\/+$/, '');
