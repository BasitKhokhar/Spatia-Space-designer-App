import { AppState } from 'react-native';

import { AD_CONFIG } from './config';
import { APP_OPEN_AD_UNIT } from './adUnits';
import { createAdSlot } from './loader';
import { canShowAds } from './gate';
import { getAdsModule } from './state';

// App Open ads — built, but off by default (AD_CONFIG.appOpenEnabled).
//
// The format is the single most-complained-about one in mobile apps and sits
// closest to Google's Disruptive Ads line: an ad over a splash screen, or over
// a design the user was in the middle of editing, is a policy violation as well
// as a bad experience. The rules below are the conditions under which it is
// defensible; flipping the flag without them would not be.

const slot = createAdSlot({
  kind: 'appOpen',
  getUnitId: () => APP_OPEN_AD_UNIT,
  create: (mod, unitId, options) => mod.AppOpenAd.createForAdRequest(unitId, options),
});

const MIN_BACKGROUND_MS = 30_000;
const MAX_PER_SESSION = 1;
const MAX_PER_DAY = 3;

let backgroundedAt = 0;
let shownThisSession = 0;
let shownToday = 0;
let day = new Date().toISOString().slice(0, 10);
let subscription = null;
// Set once the app has fully booted; an App Open ad must never cover the splash
// or the first launch.
let bootComplete = false;
let firstLaunchHandled = false;

function rollDay() {
  const d = new Date().toISOString().slice(0, 10);
  if (d !== day) {
    day = d;
    shownToday = 0;
  }
}

export function markBootComplete() {
  bootComplete = true;
}

export function preloadAppOpen() {
  if (!AD_CONFIG.appOpenEnabled) return;
  slot.preload();
}

export function invalidateAppOpen() {
  slot.invalidate();
}

async function maybeShowOnResume() {
  if (!AD_CONFIG.appOpenEnabled) return false;
  if (!bootComplete) return false;
  if (!firstLaunchHandled) {
    // The very first foreground of a launch is not a "resume".
    firstLaunchHandled = true;
    return false;
  }
  if (!getAdsModule()) return false;
  if (Date.now() - backgroundedAt < MIN_BACKGROUND_MS) return false;

  rollDay();
  if (shownThisSession >= MAX_PER_SESSION) return false;
  if (shownToday >= MAX_PER_DAY) return false;
  // Route blocking still applies: never over the editor, viewer, auth or paywall.
  if (!canShowAds()) return false;
  if (!slot.isLoaded()) {
    slot.preload();
    return false;
  }

  const result = await slot.show();
  if (result.shown) {
    shownThisSession += 1;
    shownToday += 1;
  }
  return !!result.shown;
}

export function startAppOpenWatcher() {
  if (subscription || !AD_CONFIG.appOpenEnabled) return;
  subscription = AppState.addEventListener('change', (next) => {
    if (next === 'background' || next === 'inactive') {
      backgroundedAt = Date.now();
    } else if (next === 'active') {
      maybeShowOnResume().catch(() => {});
    }
  });
}

export function stopAppOpenWatcher() {
  subscription?.remove?.();
  subscription = null;
}
