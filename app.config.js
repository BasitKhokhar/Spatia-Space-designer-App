// Expo app configuration for HomePlanner.
// Uses config plugins for native modules that require a custom Dev Client
// (Skia, AdMob, GL, MMKV, tracking transparency). Not runnable in Expo Go.
module.exports = {
  expo: {
    name: 'HomePlanner',
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
      '@shopify/react-native-skia',
      [
        'react-native-google-mobile-ads',
        {
          // Replace with your real AdMob app IDs before production.
          androidAppId: 'ca-app-pub-3940256099942544~3347511713',
          // iosAppId: 'ca-app-pub-3940256099942544~1458002511',
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
      eas: { projectId: '00000000-0000-0000-0000-000000000000' },
    },
  },
};
