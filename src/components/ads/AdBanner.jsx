import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { useCreditsStore } from '@/store/useCreditsStore';
import { useAdLayout } from '@/store/useAdLayout';
import { useAdsReady } from '@/hooks/useAdsReady';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { AD_CONFIG } from '@/services/ads/config';
import { BANNER_AD_UNIT } from '@/services/ads/adUnits';
import { getAdsModule, getNpa, requestOptions } from '@/services/ads/state';

// Gap between the ad and the tab row. AdMob requires ads to be clearly separate
// from tappable app UI; without it the banner butts straight against the tab
// buttons and every mis-tap becomes an accidental click.
const GAP = 8;

// Anchored adaptive banner for the tab screens.
//
// Renders nothing at all — zero height, no reserved space — whenever an ad
// can't or shouldn't be shown. That is the whole contract: a user who is
// offline, has paid for ad removal, or simply got no fill sees the app exactly
// as it looks without ads.
export default function AdBanner({ style }) {
  const { colors } = useTheme();
  const adsDisabled = useCreditsStore((s) => s.serverAdsDisabled === true || s.tier !== 'free');
  const ready = useAdsReady();
  const online = useNetworkStatus();
  const setBannerHeight = useAdLayout((s) => s.setBannerHeight);

  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const failures = useRef(0);
  const retryTimer = useRef(null);

  const mod = getAdsModule();
  const enabled = AD_CONFIG.bannerEnabled && !!mod && !adsDisabled && ready && online && !failed;

  // Always give the space back when the banner goes away, or the tab screens
  // keep padding for an ad that is no longer there.
  useEffect(() => {
    if (!enabled) setBannerHeight(0);
  }, [enabled, setBannerHeight]);

  useEffect(
    () => () => {
      clearTimeout(retryTimer.current);
      setBannerHeight(0);
    },
    [setBannerHeight]
  );

  const onAdLoaded = useCallback(
    (dimensions) => {
      failures.current = 0;
      const height = dimensions?.height;
      if (height) setBannerHeight(height + GAP);
    },
    [setBannerHeight]
  );

  const onAdFailedToLoad = useCallback(() => {
    setBannerHeight(0);
    failures.current += 1;
    if (failures.current >= AD_CONFIG.bannerRetryLimit) {
      // Stop asking for the rest of the session rather than retrying forever.
      setFailed(true);
      return;
    }
    clearTimeout(retryTimer.current);
    retryTimer.current = setTimeout(() => setAttempt((n) => n + 1), AD_CONFIG.bannerRetryMs);
  }, [setBannerHeight]);

  if (!enabled) return null;

  const { BannerAd, BannerAdSize } = mod;
  if (!BannerAd) return null;

  return (
    <View style={[{ backgroundColor: colors.tabBar, alignItems: 'center', paddingBottom: GAP }, style]}>
      <BannerAd
        // Remounts on a consent change so the next request carries the new
        // personalisation flag instead of reusing the old one.
        key={`${getNpa() ? 'npa' : 'personalised'}-${attempt}`}
        unitId={BANNER_AD_UNIT}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={requestOptions()}
        onAdLoaded={onAdLoaded}
        onAdFailedToLoad={onAdFailedToLoad}
      />
    </View>
  );
}
