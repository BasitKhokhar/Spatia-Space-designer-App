import { isRemote } from '@/services/api/client';
import { useAdFrequency } from '@/store/useAdFrequency';

import { AD_CONFIG } from './config';
import { REWARDED_AD_UNIT } from './adUnits';
import { createAdSlot } from './loader';
import { canShowRewarded } from './gate';
import { getAdsModule, whenAdsReady } from './state';

const slot = createAdSlot({
  kind: 'rewarded',
  getUnitId: () => REWARDED_AD_UNIT,
  create: (mod, unitId, options) => mod.RewardedAd.createForAdRequest(unitId, options),
  loadedEvent: (mod) => mod.RewardedAdEventType.LOADED,
  rewardEvent: (mod) => mod.RewardedAdEventType.EARNED_REWARD,
});

export function preloadRewarded() {
  if (!AD_CONFIG.rewardedEnabled) return;
  slot.preload();
}

export function invalidateRewarded() {
  slot.invalidate();
}

export function isRewardedReady() {
  return slot.isLoaded();
}

// Detailed result: { earned, reason }. Every path returns, including every
// failure — a caller's `busy` flag is always safe to clear afterwards.
export async function showRewardedAdEx(showOptions) {
  if (!AD_CONFIG.rewardedEnabled) return { earned: false, reason: 'disabled' };

  const mod = getAdsModule();
  if (!mod) {
    // Dev-only simulation so rewarded flows are testable without the native
    // module. Gated on !isRemote() as well, so a dev build pointed at the real
    // backend can never mint credits against a live account.
    if (__DEV__ && !isRemote()) {
      await new Promise((r) => setTimeout(r, 1200));
      useAdFrequency.getState().recordRewarded();
      return { earned: true, reason: 'dev-fallback' };
    }
    return { earned: false, reason: 'no-sdk' };
  }

  // A user can tap "watch an ad" before the SDK has finished initialising.
  await whenAdsReady();
  if (!canShowRewarded()) return { earned: false, reason: 'gated' };

  if (!slot.isLoaded()) {
    const ok = await slot.waitForLoad();
    if (!ok) return { earned: false, reason: 'load-failed' };
  }

  const result = await slot.show(showOptions);
  if (result.shown) useAdFrequency.getState().recordRewarded();
  return { earned: !!result.earned, reason: result.reason || null };
}

// Boolean form. Kept as the default export shape because existing call sites do
// `const earned = await showRewardedAd(); if (earned) ...` — returning an object
// here would make every one of them silently read as "always earned".
export async function showRewardedAd(showOptions) {
  const { earned } = await showRewardedAdEx(showOptions);
  return earned;
}
