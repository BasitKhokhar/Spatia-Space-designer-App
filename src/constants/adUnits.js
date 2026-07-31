import { Platform } from 'react-native';

// Real units come from .env; the fallbacks are Google's official TEST ad unit
// IDs (required by AdMob policy during development).
// The EXPO_PUBLIC_ prefix is load-bearing: Metro only inlines process.env vars
// with that prefix into the bundle, so an unprefixed name reads as undefined in
// a release build and silently falls back to the test unit.
export const REWARDED_AD_UNIT = Platform.select({
  android:
    process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ANDROID ||
    'ca-app-pub-3940256099942544/5224354917',
  ios: process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_IOS || 'ca-app-pub-3940256099942544/1712485313',
  default: 'ca-app-pub-3940256099942544/5224354917',
});
