import { Platform } from 'react-native';

// Google's official TEST ad unit IDs. Replace with your real units for release.
// Using test IDs during development is required by AdMob policy.
export const REWARDED_AD_UNIT = Platform.select({
  android: process.env.ADMOB_REWARDED_UNIT_ANDROID || 'ca-app-pub-3940256099942544/5224354917',
  ios: process.env.ADMOB_REWARDED_UNIT_IOS || 'ca-app-pub-3940256099942544/1712485313',
  default: 'ca-app-pub-3940256099942544/5224354917',
});
