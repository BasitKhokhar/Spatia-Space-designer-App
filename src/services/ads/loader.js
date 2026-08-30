import { AD_CONFIG } from './config';
import { getAdsModule, whenAdsReady, requestOptions, isPresenting, setPresenting } from './state';

// One preloaded, self-healing ad slot.
//
// Everything here exists to guarantee two things:
//   1. Every promise settles. A load that never returns, a CLOSED event that
//      never fires, a show() that throws — each has a timer behind it, so no
//      caller is ever left with a spinner it can't clear.
//   2. show() never waits. If nothing is cached it returns immediately and the
//      user flow continues untouched; a missed impression is always cheaper
//      than a frozen screen.
export function createAdSlot({
  kind,
  getUnitId,
  create,
  loadedEvent,
  rewardEvent,
  timeoutMs = AD_CONFIG.loadTimeoutMs,
}) {
  let ad = null;
  let loaded = false;
  let loading = false;
  let failures = 0;
  let earned = false;

  let unsubs = [];
  let loadTimer = null;
  let retryTimer = null;
  let showTimer = null;
  let showResolve = null;
  let loadWaiters = [];

  function log(...args) {
    if (__DEV__) console.log(`[admob:${kind}]`, ...args);
  }

  function settleLoad(ok) {
    const waiters = loadWaiters;
    loadWaiters = [];
    waiters.forEach((fn) => fn(ok));
  }

  function teardown() {
    unsubs.forEach((u) => {
      try {
        if (u) u();
      } catch {
        /* listener already gone */
      }
    });
    unsubs = [];
    ad = null;
    loaded = false;
    loading = false;
    clearTimeout(loadTimer);
    loadTimer = null;
  }

  function scheduleRetry() {
    if (retryTimer) return;
    const table = AD_CONFIG.loadRetryBackoffMs;
    const delay = table[Math.min(failures, table.length - 1)];
    retryTimer = setTimeout(() => {
      retryTimer = null;
      preload();
    }, delay);
    if (retryTimer && typeof retryTimer.unref === 'function') retryTimer.unref();
  }

  // Single exit path for every failure, whether it happened while loading or
  // while presenting.
  function fail(reason) {
    log('failed:', reason);
    const resolveShow = showResolve;
    showResolve = null;
    clearTimeout(showTimer);
    showTimer = null;
    if (resolveShow) setPresenting(false);

    teardown();
    failures += 1;
    settleLoad(false);
    if (resolveShow) resolveShow({ shown: false, earned: false, reason });
    scheduleRetry();
  }

  function finishShow(result) {
    const resolveShow = showResolve;
    showResolve = null;
    clearTimeout(showTimer);
    showTimer = null;
    setPresenting(false);
    teardown();
    if (resolveShow) resolveShow(result);
    // Start fetching the next one straight away so the following break point
    // has something cached.
    preload();
  }

  async function preload() {
    if (loaded || loading) return;

    const ready = await whenAdsReady();
    if (!ready) {
      settleLoad(false);
      return;
    }
    const mod = getAdsModule();
    if (!mod) {
      settleLoad(false);
      return;
    }
    // A concurrent preload may have completed while we awaited readiness.
    if (loaded || loading) return;

    loading = true;
    earned = false;

    try {
      ad = create(mod, getUnitId(), requestOptions());
    } catch (e) {
      loading = false;
      fail('create-failed');
      return;
    }

    const { AdEventType } = mod;
    const LOADED = loadedEvent ? loadedEvent(mod) : AdEventType.LOADED;

    unsubs.push(
      ad.addAdEventListener(LOADED, () => {
        clearTimeout(loadTimer);
        loadTimer = null;
        loading = false;
        loaded = true;
        failures = 0;
        log('loaded');
        settleLoad(true);
      })
    );

    if (rewardEvent) {
      unsubs.push(
        ad.addAdEventListener(rewardEvent(mod), () => {
          earned = true;
        })
      );
    }

    unsubs.push(
      ad.addAdEventListener(AdEventType.CLOSED, () => {
        finishShow({ shown: true, earned, reason: null });
      })
    );

    unsubs.push(ad.addAdEventListener(AdEventType.ERROR, () => fail('ad-error')));

    // The load timeout is the whole reason a stalled request can't hang a
    // caller: if none of the events above ever fire, this one does.
    loadTimer = setTimeout(() => fail('load-timeout'), timeoutMs);
    if (loadTimer && typeof loadTimer.unref === 'function') loadTimer.unref();

    try {
      ad.load();
    } catch {
      fail('load-threw');
    }
  }

  // Resolves true once an ad is cached, false if it couldn't be loaded. Bounded
  // by its own timer so it settles even before the slot's load timer is armed.
  function waitForLoad(waitMs = timeoutMs) {
    if (loaded) return Promise.resolve(true);
    return new Promise((resolve) => {
      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(ok);
      };
      const timer = setTimeout(() => finish(false), waitMs + 1_000);
      if (timer && typeof timer.unref === 'function') timer.unref();
      loadWaiters.push(finish);
      preload();
    });
  }

  function show(showOptions) {
    if (!loaded || !ad) {
      // Nothing cached: return now, fetch for next time.
      preload();
      return Promise.resolve({ shown: false, earned: false, reason: 'not-loaded' });
    }
    if (isPresenting()) {
      return Promise.resolve({ shown: false, earned: false, reason: 'already-presenting' });
    }

    earned = false;
    setPresenting(true);

    return new Promise((resolve) => {
      showResolve = resolve;
      // Backstop for a CLOSED event that never arrives.
      showTimer = setTimeout(() => finishShow({ shown: true, earned, reason: 'close-timeout' }), AD_CONFIG.showFailsafeMs);
      if (showTimer && typeof showTimer.unref === 'function') showTimer.unref();

      try {
        ad.show(showOptions);
      } catch {
        fail('show-threw');
      }
    });
  }

  // Drops any cached ad so the next load picks up new request options. Called
  // when consent (and therefore the NPA flag) changes.
  function invalidate() {
    if (showResolve) return; // never yank an ad out from under the user
    clearTimeout(retryTimer);
    retryTimer = null;
    failures = 0;
    teardown();
  }

  return {
    kind,
    preload,
    waitForLoad,
    show,
    invalidate,
    isLoaded: () => loaded,
  };
}
