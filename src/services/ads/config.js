// Every ad tunable in one place.
//
// The numbers here are the contract behind the app's one hard rule about ads:
// if AdMob returns nothing, the app must behave exactly as if it had no ad code
// in it at all. Every timeout below exists so a promise always settles and no
// spinner, sheet or navigation is ever left waiting on an ad that never came.
export const AD_CONFIG = {
  // Give up on a single ad load after this long and let the caller continue.
  loadTimeoutMs: 10_000,
  // Backstop for a presented ad whose CLOSED event never arrives (a process
  // death behind the ad, a broken adapter). Without it the slot would stay
  // "presenting" forever and never preload again.
  showFailsafeMs: 120_000,
  // Hard ceiling on SDK init + consent. Armed at module load, so readiness
  // resolves even if initMonetization() is never called at all.
  initTimeoutMs: 15_000,
  // Backoff between failed loads, indexed by consecutive failure count.
  loadRetryBackoffMs: [0, 5_000, 15_000, 60_000],

  // Global request configuration (applied before initialize()).
  maxAdContentRating: 'PG',
  tagForChildDirectedTreatment: false,
  tagForUnderAgeOfConsent: false,
  // Comma-separated device hashes; the SDK prints yours on the first request.
  // Required before pointing a build at real unit ids — clicking your own live
  // ads is invalidated traffic and gets AdMob accounts suspended.
  testDeviceIds: (process.env.EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  // Format switches. Native and App Open are built but off: both carry policy
  // risk (ad/content confusion, and full-screen-on-resume) that isn't worth it
  // until the three core formats are proven in production.
  rewardedEnabled: true,
  interstitialEnabled: true,
  bannerEnabled: true,
  nativeEnabled: false,
  appOpenEnabled: false,

  // A banner that keeps failing stays collapsed rather than retrying forever.
  bannerRetryLimit: 3,
  bannerRetryMs: 60_000,

  // Interstitial frequency caps. Tuned to sit well inside Google's "disruptive
  // ads" line: never early in a session, never twice in quick succession, and
  // never on top of a rewarded video the user just sat through.
  freq: {
    sessionGraceMs: 90_000, // no interstitial in the first 90s of a session
    minActionsBeforeFirst: 2, // the first qualifying action never shows one
    minGapMs: 180_000, // >= 3 min between interstitials
    minAfterRewardedMs: 60_000, // >= 60s after a rewarded video ends
    maxPerSession: 3,
    maxPerDay: 8,
    sessionIdleResetMs: 1_800_000, // 30 min backgrounded starts a new session
  },
};

// Lets the backend dial ad behaviour (or kill a format outright) without
// shipping a release. Only known keys are copied so a malformed payload can't
// introduce surprise fields.
export function applyRemoteAdConfig(patch) {
  if (!patch || typeof patch !== 'object') return;
  for (const key of Object.keys(patch)) {
    if (!(key in AD_CONFIG)) continue;
    if (key === 'freq' && patch.freq && typeof patch.freq === 'object') {
      Object.assign(AD_CONFIG.freq, patch.freq);
    } else {
      AD_CONFIG[key] = patch[key];
    }
  }
}
