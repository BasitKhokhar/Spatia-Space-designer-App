import { useEffect, useState } from 'react';

import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';

// Minimum time the branded splash stays visible on a cold start. Long enough to
// register the logo, short enough not to feel like a stall.
const MIN_SPLASH_MS = 2200;

// Resolves once a persisted store has finished rehydrating from storage. MMKV is
// synchronous so this is usually already true, but gating on it keeps the boot
// correct if the storage backend ever becomes async.
function whenHydrated(store) {
  if (store.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = store.persist.onFinishHydration(() => {
      unsub?.();
      resolve();
    });
  });
}

// Cold-start gate for the branded splash. Returns `false` while the app is
// booting and flips to `true` once (a) the persisted auth/settings stores have
// rehydrated and (b) the minimum splash window has elapsed. Runs once per launch
// and is unaffected by later login/logout, so logout drops straight to Login
// without replaying the splash.
export function useAppBootstrap() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer;
    const start = Date.now();

    Promise.all([whenHydrated(useAuthStore), whenHydrated(useSettingsStore)]).then(() => {
      if (cancelled) return;
      const remaining = Math.max(0, MIN_SPLASH_MS - (Date.now() - start));
      timer = setTimeout(() => {
        if (!cancelled) setReady(true);
      }, remaining);
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return ready;
}
