const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

// ---------------------------------------------------------------------------
// Strip permissions this app does not use.
//
// Google Play's Photo and Video Permissions policy forbids requesting
// READ_MEDIA_IMAGES / READ_MEDIA_VIDEO unless photo access is a core function.
// It is not: the only media call in the whole app is
// MediaLibrary.saveToLibraryAsync (src/services/export/exporters.js) — a
// write. There is no camera, no image picker, and nothing ever reads the user's
// library.
//
// We still end up requesting all of them, because we do not declare them:
//   • expo-media-library's own AndroidManifest.xml merges in
//     READ_MEDIA_VISUAL_USER_SELECTED, READ_EXTERNAL_STORAGE and
//     WRITE_EXTERNAL_STORAGE;
//   • react-native's debug manifest leaks SYSTEM_ALERT_WINDOW, a restricted
//     permission we have no justification for.
//
// Manifest merger only removes a permission when something explicitly says to,
// hence tools:node="remove". Editing android/ by hand would not survive
// `expo prebuild` — android/ is gitignored and regenerated.
//
// WRITE_EXTERNAL_STORAGE is the one exception and is deliberately NOT removed:
// on API 28 and below, saveToLibraryAsync genuinely needs it, and this app's
// minSdkVersion is 24. It is capped at maxSdkVersion=28 instead, which is both
// honest and defensible — the permission is requested only on the versions that
// actually require it, and is absent on every modern device.
// ---------------------------------------------------------------------------

// Read access we never use. All four are pure policy risk for us.
const REMOVE = [
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_MEDIA_AUDIO',
  'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
  'android.permission.READ_EXTERNAL_STORAGE',
  // Restricted permission (draw over other apps). Leaked in by a dependency's
  // debug manifest; nothing in this app draws an overlay.
  'android.permission.SYSTEM_ALERT_WINDOW',
];

// Kept, but scoped to the API levels that actually need it.
const CAP_AT_28 = ['android.permission.WRITE_EXTERNAL_STORAGE'];

module.exports = function withStrippedPermissions(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    // tools: prefix must be declared or the remove markers are inert.
    manifest.$ = manifest.$ || {};
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    const existing = manifest['uses-permission'] || [];

    // Drop our own copies first: a plain declaration and a remove marker for
    // the same permission in one manifest is a merger conflict.
    const kept = existing.filter((p) => {
      const name = p.$?.['android:name'];
      return !REMOVE.includes(name) && !CAP_AT_28.includes(name);
    });

    REMOVE.forEach((name) => {
      kept.push({ $: { 'android:name': name, 'tools:node': 'remove' } });
    });

    CAP_AT_28.forEach((name) => {
      kept.push({
        $: {
          'android:name': name,
          'android:maxSdkVersion': '28',
          // The dependency merges this in uncapped; replace makes our capped
          // version win rather than the merger keeping the broader one.
          'tools:node': 'replace',
        },
      });
    });

    manifest['uses-permission'] = kept;

    // Legacy scoped-storage opt-out. Meaningless from API 30 and reads as an
    // app that wants broad storage access — exactly the impression to avoid
    // while removing storage permissions.
    // Via the helper rather than manifest.application[0]: the parsed shape is
    // not guaranteed and an optional-chained miss would silently do nothing.
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    delete application.$['android:requestLegacyExternalStorage'];

    return cfg;
  });
};
