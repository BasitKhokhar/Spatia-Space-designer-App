// Expo app configuration for HomePlanner.
// Uses config plugins for native modules that require a custom Dev Client
// (Skia, AdMob, GL, MMKV, tracking transparency). Not runnable in Expo Go.
//
// Values that differ between environments come from process.env (Expo loads
// the project's .env files automatically). Fallbacks are the Google AdMob
// test IDs / example URLs so local dev works without a filled-in .env.
const env = process.env;

const ADMOB_ANDROID_APP_ID =
  env.ADMOB_ANDROID_APP_ID || 'ca-app-pub-3940256099942544~3347511713';
const ADMOB_IOS_APP_ID =
  env.ADMOB_IOS_APP_ID || 'ca-app-pub-3940256099942544~1458002511';
const EAS_PROJECT_ID = env.EXPO_ID || 'aa4c6755-9123-4c2d-bf10-3a3d815074f0';
// Each of these accepts the EXPO_PUBLIC_-prefixed name (what a local .env
// uses) and the bare name (what the EAS environments define). This file runs
// in Node at build time so both are visible here; picking only one spelling is
// how a value silently ends up undefined in a cloud build and disappears from
// `extra` entirely, since JSON.stringify drops undefined keys.
const PRIVACY_POLICY_URL =
  env.EXPO_PUBLIC_PRIVACY_POLICY_URL || env.PRIVACY_POLICY_URL || 'https://example.com/privacy';
const TERMS_URL =
  env.EXPO_PUBLIC_TERMS_URL || env.TERMS_URL || 'https://example.com/terms';
const ADMOB_REWARDED_UNIT_ANDROID =
  env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ANDROID || env.ADMOB_REWARDED_UNIT_ANDROID || '';
const ADMOB_REWARDED_UNIT_IOS =
  env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_IOS || env.ADMOB_REWARDED_UNIT_IOS || '';
const GOOGLE_WEB_CLIENT_ID = env.GOOGLE_WEB_CLIENT_ID || '';

module.exports = {
  expo: {
    name: 'Spatia:3D Space Designer',
    slug: 'spatia3d-space-designer',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    scheme: 'homeplanner',
    owner: 'basit5000',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#131210',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.spatia3dspacedesigner.app',
      infoPlist: {
        NSUserTrackingUsageDescription:
          'This lets us show you more relevant ads to keep HomePlanner free.',
        NSPhotoLibraryAddUsageDescription:
          'HomePlanner saves your exported designs to your photo library.',
      },
    },
    android: {
      package: 'com.spatia3dspacedesigner.app',
      googleServicesFile: './google-services.json',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#131210',
      },
      // POST_NOTIFICATIONS: Android 13+ runtime grant for the download progress
      // notification, and now also FCM pushes. FOREGROUND_SERVICE(+_DATA_SYNC):
      // required from Android 14 to keep the transfer running while the app is
      // backgrounded — without the typed permission the service throws at
      // startup on API 34+.
      // com.android.vending.BILLING: required by Google Play Billing for the
      // in-app subscription purchase flow (expo-iap).
      permissions: [
        'INTERNET',
        'ACCESS_NETWORK_STATE',
        'POST_NOTIFICATIONS',
        'FOREGROUND_SERVICE',
        'FOREGROUND_SERVICE_DATA_SYNC',
        'com.android.vending.BILLING',
      ],
    },
    plugins: [
      'expo-dev-client',
      'expo-secure-store',
      'expo-iap',
      'expo-tracking-transparency',
      '@react-native-firebase/app',
      '@react-native-firebase/messaging',
      '@react-native-google-signin/google-signin',
      [
        'react-native-google-mobile-ads',
        {
          androidAppId: ADMOB_ANDROID_APP_ID,
          iosAppId: ADMOB_IOS_APP_ID,
          userTrackingUsageDescription:
            'This lets us show you more relevant ads to keep HomePlanner free.',
        },
      ],
      [
        'expo-media-library',
        {
          savePhotosPermission: 'Allow HomePlanner to save exported designs.',
          isAccessMediaLocationEnabled: false,
        },
      ],
      [
        'expo-splash-screen',
        {
          backgroundColor: '#131210',
          image: './assets/splash.png',
          imageWidth: 160,
        },
      ],
    ],
    extra: {
      eas: { projectId: EAS_PROJECT_ID },
      // Surfaced to the app at runtime via expo-constants.
      admobRewardedUnitAndroid: ADMOB_REWARDED_UNIT_ANDROID,
      admobRewardedUnitIos: ADMOB_REWARDED_UNIT_IOS,
      privacyPolicyUrl: PRIVACY_POLICY_URL,
      termsUrl: TERMS_URL,
      // Backend URL, threaded through extra so it survives an EAS environment
      // that defines it WITHOUT the EXPO_PUBLIC_ prefix. Metro inlines only
      // EXPO_PUBLIC_* into the bundle, so a bare API_BASE_URL would otherwise
      // never reach the app and it would silently run local-first with no
      // backend. Read as the last fallback in src/constants/config.js.
      apiBaseUrl: env.EXPO_PUBLIC_API_BASE_URL || env.API_BASE_URL || '',
      // Not EXPO_PUBLIC_-prefixed (Metro won't inline it), so it's threaded
      // through here for GoogleSignin.configure() at runtime via expo-constants.
      googleWebClientId: GOOGLE_WEB_CLIENT_ID,
    },
  },
};
