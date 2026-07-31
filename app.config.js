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
const PRIVACY_POLICY_URL = env.EXPO_PUBLIC_PRIVACY_POLICY_URL || 'https://example.com/privacy';
const TERMS_URL = env.EXPO_PUBLIC_TERMS_URL || 'https://example.com/terms';

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
      bundleIdentifier: 'com.homeplanner.app',
      infoPlist: {
        NSUserTrackingUsageDescription:
          'This lets us show you more relevant ads to keep HomePlanner free.',
        NSPhotoLibraryAddUsageDescription:
          'HomePlanner saves your exported designs to your photo library.',
      },
    },
    android: {
      package: 'com.homeplanner.app',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#131210',
      },
      permissions: ['INTERNET', 'ACCESS_NETWORK_STATE'],
    },
    plugins: [
      'expo-dev-client',
      'expo-secure-store',
      'expo-tracking-transparency',
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
      admobRewardedUnitAndroid: env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ANDROID,
      admobRewardedUnitIos: env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_IOS,
      privacyPolicyUrl: PRIVACY_POLICY_URL,
      termsUrl: TERMS_URL,
    },
  },
};
