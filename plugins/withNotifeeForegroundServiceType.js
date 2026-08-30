// Notifee's own AAR manifest declares its foreground service as
//
//   <service android:name="app.notifee.core.ForegroundService"
//            android:foregroundServiceType="shortService" />
//
// but the download notification starts it with FOREGROUND_SERVICE_TYPE_DATA_SYNC
// (see src/services/assets/notification.js). From Android 14 the type passed to
// startForeground() must be a subset of the manifest's, so the mismatch throws
//
//   IllegalArgumentException: foregroundServiceType 0x00000001 is not a subset
//   of foregroundServiceType attribute 0x00000800
//
// and takes the whole app down a few seconds after launch, as soon as the first
// asset download posts progress.
//
// shortService is also wrong on its own terms: it is capped at ~3 minutes, which
// a full asset download routinely exceeds. So declare dataSync (what we actually
// do — pull files over the network) and keep shortService for any other notifee
// caller, overriding the library element with tools:replace.
const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

const SERVICE = 'app.notifee.core.ForegroundService';
const TYPES = 'dataSync|shortService';

module.exports = function withNotifeeForegroundServiceType(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app.service = app.service || [];

    let service = app.service.find((s) => s.$?.['android:name'] === SERVICE);
    if (!service) {
      service = { $: { 'android:name': SERVICE, 'android:exported': 'false' } };
      app.service.push(service);
    }
    service.$['android:foregroundServiceType'] = TYPES;
    // Without this the merger fails the build rather than letting the app win
    // over the library's value.
    service.$['tools:replace'] = 'android:foregroundServiceType';

    return cfg;
  });
};
