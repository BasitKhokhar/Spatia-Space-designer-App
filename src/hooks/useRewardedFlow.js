import { useCallback, useEffect, useRef, useState } from 'react';

import { useCreditsStore } from '@/store/useCreditsStore';
import { showRewardedAdEx } from '@/services/ads/rewarded';
import { canShowRewarded } from '@/services/ads/gate';
import { AD_CONFIG } from '@/services/ads/config';

// Shared "watch an ad for credits" flow.
//
// Every rewarded surface used to repeat the same six lines, each with its own
// subtly different bug — a busy flag that never cleared, an un-awaited
// earnFromAd() that let the spinner stop before the balance landed, an ad
// offered to a subscriber. Centralising it means those are fixed once.
export function useRewardedFlow() {
  const [busy, setBusy] = useState(false);
  // An ad can outlive the surface that started it (the unlock sheet closes, a
  // screen is popped), so the busy reset has to check before it fires.
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    []
  );

  // Reactive selectors, not getState(): the button has to disappear the moment
  // the daily cap is hit, and reading the store during render would also mean
  // writing to it during render (canWatchAd rolls the day over).
  const adsWatchedToday = useCreditsStore((s) => s.adsWatchedToday);
  const dailyAdCap = useCreditsStore((s) => s.dailyAdCap);
  const perAd = useCreditsStore((s) => s.perAd);
  const adsDisabled = useCreditsStore((s) => s.serverAdsDisabled === true || s.tier !== 'free');
  const earnFromAd = useCreditsStore((s) => s.earnFromAd);

  const adsRemaining = Math.max(0, dailyAdCap - adsWatchedToday);
  const canWatch = AD_CONFIG.rewardedEnabled && !adsDisabled && adsRemaining > 0;

  // Resolves { earned, capped, reason }. Never throws, and busy is always
  // cleared — a failed or missing ad leaves the caller exactly where it was.
  const watch = useCallback(async () => {
    if (busy) return { earned: false, reason: 'busy' };
    if (adsDisabled) return { earned: false, reason: 'ads-disabled' };
    if (adsRemaining <= 0) return { earned: false, capped: true, reason: 'daily-cap' };
    if (!canShowRewarded()) return { earned: false, reason: 'unavailable' };

    setBusy(true);
    try {
      const { earned, reason } = await showRewardedAdEx();
      if (!earned) return { earned: false, reason };
      // Awaited: the balance must be in place before the caller re-reads it.
      const granted = await earnFromAd();
      return { earned: granted, capped: !granted, reason: granted ? null : 'grant-rejected' };
    } catch {
      return { earned: false, reason: 'error' };
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, [busy, adsDisabled, adsRemaining, earnFromAd]);

  return { busy, canWatch, adsRemaining, dailyAdCap, perAd, adsDisabled, watch };
}
