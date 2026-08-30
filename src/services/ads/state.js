import { AD_CONFIG } from './config';

// Leaf module for shared ad state. Imports nothing app-level on purpose: gate.js
// needs the credits store, interstitial.js needs gate.js, and admob.js needs
// both — holding the readiness deferred here is what keeps that from becoming a
// require cycle.

let ads;
let resolved = false;

// Lazy-require the native SDK so the JS bundle still loads without it (Expo Go,
// a JS-only test run). Returns null forever after the first failure.
export function getAdsModule() {
  if (ads !== undefined) return ads;
  try {
    // eslint-disable-next-line global-require
    ads = require('react-native-google-mobile-ads');
  } catch {
    ads = null;
  }
  if (ads === null) markAdsReady(false);
  return ads;
}

let readyValue = false;
let resolveReady;
const readyPromise = new Promise((res) => {
  resolveReady = res;
});

// Armed at module load, not inside initMonetization(). That ordering is the
// point: readiness settles within initTimeoutMs even if init is never called,
// throws before its finally, or hangs inside a native call. Nothing awaiting
// ads can deadlock.
const initTimer = setTimeout(() => markAdsReady(false), AD_CONFIG.initTimeoutMs);
if (initTimer && typeof initTimer.unref === 'function') initTimer.unref();

// Idempotent: the first caller wins, later ones are ignored.
export function markAdsReady(ok) {
  if (resolved) return;
  resolved = true;
  readyValue = !!ok;
  clearTimeout(initTimer);
  resolveReady(readyValue);
}

// Resolves true when ads may be requested, false when they may not. `false` is
// a normal outcome meaning "behave as if there are no ads" — never an error.
export function whenAdsReady() {
  return readyPromise;
}

export function isAdsReady() {
  return resolved && readyValue;
}

// Non-personalised-ads flag, derived from real UMP consent by consent.js.
// Defaults to true so that any window before consent is gathered is the
// conservative one.
let npa = true;
const npaListeners = new Set();

export function getNpa() {
  return npa;
}

export function setNpa(value) {
  const next = !!value;
  if (next === npa) return;
  npa = next;
  npaListeners.forEach((fn) => {
    try {
      fn(npa);
    } catch {
      /* a listener must never break consent handling */
    }
  });
}

export function onNpaChange(fn) {
  npaListeners.add(fn);
  return () => npaListeners.delete(fn);
}

export function requestOptions(extra) {
  return { requestNonPersonalizedAdsOnly: npa, ...extra };
}

// Set while any full-screen format is on screen, so two can never stack.
let presenting = false;

export function isPresenting() {
  return presenting;
}

export function setPresenting(value) {
  presenting = !!value;
}
