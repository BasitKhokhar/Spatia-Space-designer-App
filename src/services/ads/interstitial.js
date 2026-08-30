import { InteractionManager } from 'react-native';

import { useAdFrequency } from '@/store/useAdFrequency';

import { AD_CONFIG } from './config';
import { INTERSTITIAL_AD_UNIT } from './adUnits';
import { createAdSlot } from './loader';
import { canShowAds } from './gate';
import { getAdsModule } from './state';

const slot = createAdSlot({
  kind: 'interstitial',
  getUnitId: () => INTERSTITIAL_AD_UNIT,
  create: (mod, unitId, options) => mod.InterstitialAd.createForAdRequest(unitId, options),
});

export function preloadInterstitial() {
  if (!AD_CONFIG.interstitialEnabled) return;
  slot.preload();
}

export function invalidateInterstitial() {
  slot.invalidate();
}

// Shows an interstitial only if every condition allows it. Never throws, never
// waits on a load, and returns false for every suppression path.
export async function maybeShowInterstitial(placement) {
  if (!AD_CONFIG.interstitialEnabled) return false;
  if (!getAdsModule()) return false;
  if (!canShowAds(placement)) return false;

  const freq = useAdFrequency.getState();
  const blocked = freq.interstitialBlockReason();
  if (blocked) {
    if (__DEV__) console.log(`[admob:interstitial] suppressed (${placement}): ${blocked}`);
    return false;
  }

  // Deliberately does not wait for a load. A break point that arrives with an
  // empty cache is simply skipped and refilled for next time — holding the user
  // on a spinner to fetch an ad is exactly the behaviour this whole module is
  // built to avoid.
  if (!slot.isLoaded()) {
    slot.preload();
    if (__DEV__) console.log(`[admob:interstitial] suppressed (${placement}): not-cached`);
    return false;
  }

  const result = await slot.show();
  if (result.shown) useAdFrequency.getState().recordInterstitial();
  return !!result.shown;
}

// Fire-and-forget wrapper for use right after a navigation call.
//
// runAfterInteractions lets the screen transition finish first (the root stack
// uses slide_from_right), so the ad appears over a settled screen instead of
// fighting the animation. Nothing awaits this.
export function scheduleInterstitial(placement, delayMs = 700) {
  if (!AD_CONFIG.interstitialEnabled) return;
  InteractionManager.runAfterInteractions(() => {
    setTimeout(() => {
      maybeShowInterstitial(placement).catch(() => {});
    }, delayMs);
  });
}
