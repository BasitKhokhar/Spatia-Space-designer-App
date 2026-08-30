import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Ad unit id resolution.
//
// Three sources, in order:
//   1. process.env.EXPO_PUBLIC_*  — Metro inlines ONLY this prefix into the JS
//      bundle, so an unprefixed name read here is always undefined.
//   2. Constants.expoConfig.extra.* — app.config.js runs in Node at build time
//      where the bare names ARE visible, and threads them through `extra`. This
//      is what carries an unprefixed .env / EAS value to runtime.
//   3. Google's official test units — the documented dev fallback.
//
// Both spellings are supported deliberately: the project's .env uses the bare
// names and EAS environments commonly do too. Dropping (2) would make those
// silently resolve to test units with no error anywhere — zero revenue, no
// symptom. See also the same rescue for apiBaseUrl in src/constants/config.js.

const extra = Constants.expoConfig?.extra || {};

// Google's public test units. Hardcoded rather than read from the library's
// TestIds export because this module must resolve even when the native module
// is absent (Expo Go, a bare JS test run).
export const TEST_UNIT_PREFIX = 'ca-app-pub-3940256099942544';
const TEST = {
  rewarded: { android: `${TEST_UNIT_PREFIX}/5224354917`, ios: `${TEST_UNIT_PREFIX}/1712485313` },
  interstitial: { android: `${TEST_UNIT_PREFIX}/1033173712`, ios: `${TEST_UNIT_PREFIX}/4411468910` },
  banner: { android: `${TEST_UNIT_PREFIX}/9214589741`, ios: `${TEST_UNIT_PREFIX}/2435281174` },
  appOpen: { android: `${TEST_UNIT_PREFIX}/9257395921`, ios: `${TEST_UNIT_PREFIX}/5575463023` },
  native: { android: `${TEST_UNIT_PREFIX}/2247696110`, ios: `${TEST_UNIT_PREFIX}/3986624511` },
};

function resolve(kind, envKey, extraKey) {
  const os = Platform.OS === 'ios' ? 'ios' : 'android';
  const suffix = os === 'ios' ? 'IOS' : 'ANDROID';
  const camel = os === 'ios' ? 'Ios' : 'Android';
  return (
    process.env[`EXPO_PUBLIC_ADMOB_${envKey}_UNIT_${suffix}`] ||
    extra[`admob${extraKey}Unit${camel}`] ||
    TEST[kind][os]
  );
}

export const REWARDED_AD_UNIT = resolve('rewarded', 'REWARDED', 'Rewarded');
export const INTERSTITIAL_AD_UNIT = resolve('interstitial', 'INTERSTITIAL', 'Interstitial');
export const BANNER_AD_UNIT = resolve('banner', 'BANNER', 'Banner');
export const APP_OPEN_AD_UNIT = resolve('appOpen', 'APPOPEN', 'AppOpen');
export const NATIVE_AD_UNIT = resolve('native', 'NATIVE', 'Native');

export function isTestUnit(id) {
  return String(id || '').startsWith(TEST_UNIT_PREFIX);
}

const LIVE_UNITS = {
  rewarded: REWARDED_AD_UNIT,
  interstitial: INTERSTITIAL_AD_UNIT,
  banner: BANNER_AD_UNIT,
};

export const USING_TEST_UNITS = Object.values(LIVE_UNITS).some(isTestUnit);

// A release build serving test ads earns nothing and gives no other symptom, so
// make it loud. app.config.js also hard-fails a production build for the same
// reason; this catches the case where the guard was bypassed.
if (!__DEV__ && USING_TEST_UNITS) {
  const fellBack = Object.entries(LIVE_UNITS)
    .filter(([, id]) => isTestUnit(id))
    .map(([kind]) => kind)
    .join(', ');
  // eslint-disable-next-line no-console
  console.error(
    `[admob] Release build is using Google TEST ad units for: ${fellBack}. ` +
      'These serve test ads and earn nothing. Check ADMOB_*_UNIT_* in the EAS environment.'
  );
} else if (__DEV__ && USING_TEST_UNITS) {
  const fellBack = Object.entries(LIVE_UNITS)
    .filter(([, id]) => isTestUnit(id))
    .map(([kind]) => kind)
    .join(', ');
  // eslint-disable-next-line no-console
  console.log(`[admob] Using test ad units for: ${fellBack}`);
}
