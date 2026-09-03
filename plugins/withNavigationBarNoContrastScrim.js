const { withAndroidStyles } = require('@expo/config-plugins');

// ---------------------------------------------------------------------------
// Expo SDK 54 / RN 0.81 force edge-to-edge on Android with no config-level way
// to turn it off. On 3-button-nav devices this makes Android draw its own
// semi-opaque grey contrast scrim over the transparent nav bar area — visible
// as a mismatched dark strip behind the icons no matter what color the app
// itself paints there. It's controlled by the AppTheme's
// android:enforceNavigationBarContrast attribute, which the prebuild template
// hardcodes to "true" (see android/app/src/main/res/values/styles.xml, which
// is gitignored/regenerated, so the fix has to live here to survive prebuild).
// ---------------------------------------------------------------------------
module.exports = function withNavigationBarNoContrastScrim(config) {
  return withAndroidStyles(config, (mod) => {
    const appTheme = mod.modResults.resources.style?.find((s) => s.$.name === 'AppTheme');
    if (!appTheme) return mod;

    const item = appTheme.item?.find((i) => i.$?.name === 'android:enforceNavigationBarContrast');
    if (item) {
      item._ = 'false';
    } else {
      appTheme.item = appTheme.item || [];
      appTheme.item.push({ $: { name: 'android:enforceNavigationBarContrast' }, _: 'false' });
    }

    return mod;
  });
};
