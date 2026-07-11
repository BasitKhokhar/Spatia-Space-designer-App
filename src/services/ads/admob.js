import { Platform } from 'react-native';

import { REWARDED_AD_UNIT } from '@/constants/adUnits';

// Lazy-require the native SDK so the JS bundle still loads if the module isn't
// present (e.g. running in an environment without the dev client). All ad
// functionality degrades gracefully.
let ads = null;
function getAds() {
  if (ads) return ads;
  try {
    // eslint-disable-next-line global-require
    ads = require('react-native-google-mobile-ads');
  } catch {
    ads = null;
  }
  return ads;
}

// Called once on app start: request tracking consent (iOS ATT), GDPR/UMP
// consent, then initialize the ads SDK. Compliance-required before showing ads.
export async function initMonetization() {
  // iOS App Tracking Transparency
  if (Platform.OS === 'ios') {
    try {
      // eslint-disable-next-line global-require
      const { requestTrackingPermissionsAsync } = require('expo-tracking-transparency');
      await requestTrackingPermissionsAsync();
    } catch {
      /* module optional */
    }
  }

  const mod = getAds();
  if (!mod) return;

  try {
    const { AdsConsent } = mod;
    if (AdsConsent) {
      const info = await AdsConsent.requestInfoUpdate();
      if (info.isConsentFormAvailable) {
        await AdsConsent.loadAndShowConsentFormIfRequired();
      }
    }
    await mod.default().initialize();
  } catch {
    /* non-fatal */
  }
}

// Show a rewarded ad. Resolves true if the user earned the reward.
export function showRewardedAd() {
  return new Promise((resolve) => {
    const mod = getAds();

    if (!mod) {
      // Dev fallback only: simulate a completed ad so the flow is testable
      // without the native module. Never rewards silently in production builds.
      if (__DEV__) {
        setTimeout(() => resolve(true), 1200);
      } else {
        resolve(false);
      }
      return;
    }

    const { RewardedAd, RewardedAdEventType, AdEventType } = mod;
    const rewarded = RewardedAd.createForAdRequest(REWARDED_AD_UNIT, {
      requestNonPersonalizedAdsOnly: true,
    });

    let earned = false;
    const unsub = [];

    unsub.push(
      rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => rewarded.show())
    );
    unsub.push(
      rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      })
    );
    unsub.push(
      rewarded.addAdEventListener(AdEventType.CLOSED, () => {
        unsub.forEach((u) => u && u());
        resolve(earned);
      })
    );
    unsub.push(
      rewarded.addAdEventListener(AdEventType.ERROR, () => {
        unsub.forEach((u) => u && u());
        resolve(false);
      })
    );

    rewarded.load();
  });
}
