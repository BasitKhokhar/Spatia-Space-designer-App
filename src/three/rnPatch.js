// Startup shim, imported first from index.js — runs before any three.js code.
//
// three's GLTFLoader (and a few other browser-oriented modules) read
// `navigator.userAgent` and immediately call `.match()` / `.indexOf()` on it.
// React Native defines a `navigator` global but leaves `userAgent` undefined, so
// that call throws "Cannot read property 'match' of undefined" and takes the
// whole 3D canvas down. Guarantee a plain string is present, up front, using the
// most forgiving strategy available (plain set → defineProperty).
(function ensureUserAgent() {
  const g = typeof globalThis !== 'undefined' ? globalThis : global;
  if (!g.navigator) {
    try { g.navigator = {}; } catch (e) { /* frozen global: nothing we can do */ }
  }
  const nav = g.navigator;
  if (nav && nav.userAgent == null) {
    try {
      nav.userAgent = 'ReactNative';
    } catch (e) {
      try {
        Object.defineProperty(nav, 'userAgent', {
          value: 'ReactNative',
          writable: true,
          configurable: true,
        });
      } catch (_) {
        /* read-only getter we can't touch — the loader stays disabled anyway */
      }
    }
  }
})();
