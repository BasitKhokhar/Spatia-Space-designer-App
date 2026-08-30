import { useEffect, useState } from 'react';

import { whenAdsReady, isAdsReady } from '@/services/ads/state';

// Re-renders once the ads SDK has finished initialising (or has definitively
// failed). Components use it so they never mount an ad view before consent and
// initialisation have resolved.
export function useAdsReady() {
  const [ready, setReady] = useState(isAdsReady);

  useEffect(() => {
    let alive = true;
    whenAdsReady().then((ok) => {
      if (alive) setReady(ok);
    });
    return () => {
      alive = false;
    };
  }, []);

  return ready;
}
