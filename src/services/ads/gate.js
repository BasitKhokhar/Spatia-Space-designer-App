import { ROUTES } from '@/navigation/routes';
import { currentRouteName } from '@/navigation/navigationRef';
import { useCreditsStore } from '@/store/useCreditsStore';

import { isAdsReady, isPresenting } from './state';
import { INTERSTITIAL_ALLOWED_OVER } from './placements';

// Screens where no ad of any kind may appear.
//
// The reasons differ and all of them matter: auth/onboarding/splash are flows
// AdMob's policy explicitly protects (an ad over a Skip button or a sign-in
// form reads as an accidental-click trap); Paywall is a purchase surface, where
// an ad is both a policy risk and a conversion killer; DeleteAccount is a
// destructive confirmation; the editor and 3D viewer are full-screen canvases
// with pinned toolbars and no free space; AiGenerating/AiWizard and Export are
// mid-task or credit-spend flows.
export const BLOCKED_ROUTES = new Set([
  ROUTES.splash,
  ROUTES.onboarding,
  ROUTES.login,
  ROUTES.signup,
  ROUTES.forgot,
  ROUTES.otp,
  ROUTES.paywall,
  ROUTES.aiWizard,
  ROUTES.aiGenerating,
  ROUTES.editor,
  ROUTES.view3d,
  ROUTES.export,
  ROUTES.deleteAccount,
]);

// Ads can't load offline, and the app puts a full-screen OfflineScreen overlay
// up in that state anyway.
let online = true;

export function setOnline(value) {
  online = value !== false;
}

export function isOnline() {
  return online;
}

function adsDisabledForUser() {
  try {
    return useCreditsStore.getState().adsDisabled();
  } catch {
    // If the store can't be read, assume a paying user rather than risk showing
    // ads to someone who bought them away.
    return true;
  }
}

// Gate for ads the app shows on its own initiative (banner, interstitial).
export function canShowAds(placement) {
  if (adsDisabledForUser()) return false;
  if (!isAdsReady()) return false;
  if (!online) return false;
  if (isPresenting()) return false;

  const route = currentRouteName();
  if (route && BLOCKED_ROUTES.has(route)) {
    const allowed = placement ? INTERSTITIAL_ALLOWED_OVER[placement] : null;
    if (!allowed || !allowed.includes(route)) return false;
  }
  return true;
}

// Gate for rewarded ads. Deliberately skips the route check: a rewarded ad is
// opt-in and has to work from exactly the screens that are blocked above (the
// Paywall, the Export screen, the unlock sheet) — that's where the user asks
// for it.
export function canShowRewarded() {
  if (adsDisabledForUser()) return false;
  if (!isAdsReady()) return false;
  if (!online) return false;
  if (isPresenting()) return false;
  return true;
}
