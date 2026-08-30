import { AppState, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

import { useAdFrequency } from '@/store/useAdFrequency';

import { AD_CONFIG } from './config';
import { gatherConsent } from './consent';
import { setOnline } from './gate';
import { getAdsModule, markAdsReady, setNpa, onNpaChange } from './state';
import { preloadRewarded, invalidateRewarded } from './rewarded';
import { preloadInterstitial, invalidateInterstitial } from './interstitial';
import { preloadAppOpen, invalidateAppOpen, startAppOpenWatcher, markBootComplete } from './appOpen';

let started = false;

// ATT resolves immediately as *denied* when the app isn't foregrounded, and
// init runs on cold start — so wait for 'active' before asking.
function whenAppActive() {
  if (AppState.currentState === 'active') return Promise.resolve();
  return new Promise((resolve) => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        sub.remove();
        resolve();
      }
    });
    // Never block init on a permission prompt that may never become showable.
    setTimeout(() => {
      sub.remove();
      resolve();
    }, 5_000);
  });
}

function watchConnectivity() {
  const apply = (state) => setOnline(state?.isConnected !== false && state?.isInternetReachable !== false);
  NetInfo.fetch().then(apply).catch(() => {});
  NetInfo.addEventListener(apply);
}

function watchSession() {
  let backgroundedAt = 0;
  AppState.addEventListener('change', (next) => {
    if (next === 'background' || next === 'inactive') {
      backgroundedAt = Date.now();
    } else if (next === 'active' && backgroundedAt) {
      if (Date.now() - backgroundedAt > AD_CONFIG.freq.sessionIdleResetMs) {
        useAdFrequency.getState().resetSession();
      }
      backgroundedAt = 0;
    }
  });
}

// Called once on app start. Fire-and-forget is safe: nothing else awaits this
// directly — every consumer awaits whenAdsReady(), which settles on its own
// timer even if this function throws or never returns.
export async function initMonetization() {
  if (started) return;
  started = true;

  const mod = getAdsModule();
  if (!mod) {
    // getAdsModule() already marked ads unavailable; the app now behaves
    // exactly as if it contained no ad code at all.
    return false;
  }

  let canRequestAds = true;

  try {
    // Request configuration must be applied BEFORE initialize(), or the first
    // ad request goes out without the content rating and test-device settings.
    try {
      await mod
        .default()
        .setRequestConfiguration({
          maxAdContentRating: mod.MaxAdContentRating?.[AD_CONFIG.maxAdContentRating] || AD_CONFIG.maxAdContentRating,
          tagForChildDirectedTreatment: AD_CONFIG.tagForChildDirectedTreatment,
          tagForUnderAgeOfConsent: AD_CONFIG.tagForUnderAgeOfConsent,
          testDeviceIdentifiers: __DEV__
            ? ['EMULATOR', ...AD_CONFIG.testDeviceIds]
            : AD_CONFIG.testDeviceIds,
        });
    } catch {
      /* a rejected configuration must not stop initialisation */
    }

    // UMP before ATT: the consent form is what decides whether personalised ads
    // are lawful at all, and Google's guidance is to gather it first.
    const consent = await gatherConsent();
    canRequestAds = consent.canRequestAds;
    setNpa(consent.npa);

    if (Platform.OS === 'ios') {
      try {
        await whenAppActive();
        // eslint-disable-next-line global-require
        const { requestTrackingPermissionsAsync } = require('expo-tracking-transparency');
        await requestTrackingPermissionsAsync();
      } catch {
        /* module optional */
      }
    }

    await mod.default().initialize();
  } catch {
    /* non-fatal: readiness is still settled below */
  } finally {
    markAdsReady(canRequestAds !== false);
  }

  watchConnectivity();
  watchSession();
  markBootComplete();
  startAppOpenWatcher();

  // Consent can change later (the Settings privacy row). Drop any cached ad so
  // the next request carries the new personalisation flag.
  onNpaChange(() => {
    invalidateRewarded();
    invalidateInterstitial();
    invalidateAppOpen();
    preloadRewarded();
    preloadInterstitial();
    preloadAppOpen();
  });

  preloadRewarded();
  preloadInterstitial();
  preloadAppOpen();

  return true;
}

export { whenAdsReady, isAdsReady } from './state';
export { canShowAds, canShowRewarded } from './gate';
export { showRewardedAd, showRewardedAdEx, preloadRewarded, isRewardedReady } from './rewarded';
export { maybeShowInterstitial, scheduleInterstitial, preloadInterstitial } from './interstitial';
export { privacyOptionsRequired, showPrivacyOptionsForm, resetConsentForDebug } from './consent';
export { PLACEMENT } from './placements';
