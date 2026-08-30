import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useTheme } from '@/theme/useTheme';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useProjectsStore } from '@/store/useProjectsStore';
import { useCreditsStore } from '@/store/useCreditsStore';
import { useCatalogStore } from '@/store/useCatalogStore';
import { useTemplatesStore } from '@/store/useTemplatesStore';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useAppBootstrap } from '@/hooks/useAppBootstrap';
import { linking } from './linking';
import { ROUTES } from './routes';
import {
  bootstrapAssets,
  recomputePins,
  acceptFirstRunDownload,
  deferFirstRunDownload,
  chooseOnDemandOnly,
  plannedBytes,
} from '@/services/assets/bootstrap';
import OfflineResourcesSheet from '@/components/sheets/OfflineResourcesSheet';
import { navigationRef } from './navigationRef';
import UnlockItemSheet from '@/components/sheets/UnlockItemSheet';
import { registerForPushNotifications } from '@/services/notifications/push';

// Onboarding
import SplashScreen from '@/screens/onboarding/SplashScreen';
import OnboardingScreen from '@/screens/onboarding/OnboardingScreen';
// Auth
import LoginScreen from '@/screens/auth/LoginScreen';
import SignupScreen from '@/screens/auth/SignupScreen';
import ForgotPasswordScreen from '@/screens/auth/ForgotPasswordScreen';
import OtpScreen from '@/screens/auth/OtpScreen';
// App
import TabNavigator from './TabNavigator';
import NewProjectStartScreen from '@/screens/project/NewProjectStartScreen';
import CategoryScreen from '@/screens/project/CategoryScreen';
import StarterIdeasScreen from '@/screens/project/StarterIdeasScreen';
import RoomTypeScreen from '@/screens/project/RoomTypeScreen';
import DimensionsScreen from '@/screens/project/DimensionsScreen';
import AiWizardScreen from '@/screens/ai/AiWizardScreen';
import AiGeneratingScreen from '@/screens/ai/AiGeneratingScreen';
import FloorPlanEditorScreen from '@/screens/editor/FloorPlanEditorScreen';
import ThreeDViewScreen from '@/screens/viewer/ThreeDViewScreen';
import CatalogScreen from '@/screens/catalog/CatalogScreen';
import EstimateScreen from '@/screens/estimate/EstimateScreen';
import ExportScreen from '@/screens/export/ExportScreen';
import EarnCreditsScreen from '@/screens/credits/EarnCreditsScreen';
import PaywallScreen from '@/screens/credits/PaywallScreen';
import SubscriptionScreen from '@/screens/subscription/SubscriptionScreen';
import ProfileScreen from '@/screens/profile/ProfileScreen';
import SettingsScreen from '@/screens/settings/SettingsScreen';
import HelpSupportScreen from '@/screens/settings/HelpSupportScreen';
import OfflineResourcesScreen from '@/screens/settings/OfflineResourcesScreen';
import DeleteAccountScreen from '@/screens/settings/DeleteAccountScreen';
// System
import OfflineScreen from '@/screens/system/OfflineScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { colors, isDark } = useTheme();
  const onboardingComplete = useSettingsStore((s) => s.onboardingComplete);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const hydrateProjects = useProjectsStore((s) => s.hydrate);
  const flushPendingDeletes = useProjectsStore((s) => s.flushPendingDeletes);
  const syncUnreconciled = useProjectsStore((s) => s.syncUnreconciled);
  const refreshCredits = useCreditsStore((s) => s.refresh);
  const hydrateCatalog = useCatalogStore((s) => s.hydrate);
  const hydrateTemplates = useTemplatesStore((s) => s.hydrate);
  const isConnected = useNetworkStatus();
  // Cold-start gate: keeps the branded splash up until stores rehydrate and the
  // minimum brand window elapses. Shown on every launch, before any routing.
  const appReady = useAppBootstrap();
  const [showAssetPrompt, setShowAssetPrompt] = useState(false);
  const [assetPromptBytes, setAssetPromptBytes] = useState(0);

  // The catalog is a public endpoint (no auth required) — hydrate it on every
  // cold start, not just when signed in, so a device's MMKV-cached catalog
  // (thumbUrl/modelUrl/planTopUrl) never goes stale for a logged-out session
  // and always picks up newly-published/re-seeded items on next launch.
  useEffect(() => {
    hydrateCatalog();
  }, [hydrateCatalog]);

  // Once signed in, download the remaining authoritative resources so the app
  // works offline afterwards: projects, credit/entitlement state, and the
  // premade design catalog. All no-op / bundled-fallback local-first.
  useEffect(() => {
    if (isAuthenticated) {
      hydrateProjects();
      refreshCredits();
      hydrateTemplates();
      registerForPushNotifications();
      // Catalog first: it carries the asset URLs and sizes the download plan
      // is built from. hydrate() dedupes against the cold-start call above.
      hydrateCatalog().then(() => {
        // 'prompt' = first run: ask once before spending the user's data.
        if (bootstrapAssets() === 'prompt') {
          setAssetPromptBytes(plannedBytes());
          setShowAssetPrompt(true);
        }
      });
    }
  }, [isAuthenticated, user, hydrateProjects, refreshCredits, hydrateTemplates]);

  // When connectivity returns: link any locally-created projects that never got
  // a server id, then retry deletions queued while offline — so the live DB both
  // gains the projects it's missing and drops the ones the user removed.
  useEffect(() => {
    if (isConnected && isAuthenticated) {
      syncUnreconciled();
      flushPendingDeletes();
      // Connectivity returned — the catalog may have gained items while we were
      // offline. This effect previously synced projects only, so a device that
      // cold-started offline kept a stale catalog until the next app launch.
      hydrateCatalog();
      recomputePins();
    }
  }, [isConnected, isAuthenticated, syncUnreconciled, flushPendingDeletes]);

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      background: colors.bg,
      card: colors.surface,
      text: colors.ink,
      primary: colors.accent,
      border: colors.line,
    },
  };

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer ref={navigationRef} theme={navTheme} linking={linking}>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          {!appReady ? (
            // Boot gate — the only screen mounted until the app is ready. When
            // appReady flips, the navigator swaps to the correct stack below.
            <Stack.Screen
              name={ROUTES.splash}
              component={SplashScreen}
              options={{ animation: 'fade' }}
            />
          ) : !onboardingComplete ? (
            <Stack.Group>
              <Stack.Screen name={ROUTES.onboarding} component={OnboardingScreen} />
              <Stack.Screen name={ROUTES.login} component={LoginScreen} />
              <Stack.Screen name={ROUTES.signup} component={SignupScreen} />
              <Stack.Screen name={ROUTES.forgot} component={ForgotPasswordScreen} />
              <Stack.Screen name={ROUTES.otp} component={OtpScreen} />
            </Stack.Group>
          ) : !isAuthenticated ? (
            <Stack.Group>
              <Stack.Screen name={ROUTES.login} component={LoginScreen} />
              <Stack.Screen name={ROUTES.signup} component={SignupScreen} />
              <Stack.Screen name={ROUTES.forgot} component={ForgotPasswordScreen} />
              <Stack.Screen name={ROUTES.otp} component={OtpScreen} />
            </Stack.Group>
          ) : (
            <Stack.Group>
              <Stack.Screen name={ROUTES.tabs} component={TabNavigator} />
              <Stack.Screen name={ROUTES.newProject} component={NewProjectStartScreen} />
              <Stack.Screen name={ROUTES.category} component={CategoryScreen} />
              <Stack.Screen name={ROUTES.starterIdeas} component={StarterIdeasScreen} />
              <Stack.Screen name={ROUTES.roomType} component={RoomTypeScreen} />
              <Stack.Screen name={ROUTES.dimensions} component={DimensionsScreen} />
              <Stack.Screen name={ROUTES.aiWizard} component={AiWizardScreen} />
              {/* No back gesture while a paid generation is in flight. */}
              <Stack.Screen
                name={ROUTES.aiGenerating}
                component={AiGeneratingScreen}
                options={{ gestureEnabled: false }}
              />
              <Stack.Screen name={ROUTES.editor} component={FloorPlanEditorScreen} />
              <Stack.Screen name={ROUTES.view3d} component={ThreeDViewScreen} />
              <Stack.Screen name={ROUTES.catalog} component={CatalogScreen} />
              <Stack.Screen name={ROUTES.estimate} component={EstimateScreen} />
              <Stack.Screen name={ROUTES.export} component={ExportScreen} />
              <Stack.Screen name={ROUTES.earnCredits} component={EarnCreditsScreen} />
              <Stack.Screen name={ROUTES.subscription} component={SubscriptionScreen} />
              <Stack.Screen name={ROUTES.profile} component={ProfileScreen} />
              <Stack.Screen name={ROUTES.settings} component={SettingsScreen} />
              <Stack.Screen name={ROUTES.help} component={HelpSupportScreen} />
              <Stack.Screen name={ROUTES.offlineResources} component={OfflineResourcesScreen} />
              <Stack.Screen name={ROUTES.deleteAccount} component={DeleteAccountScreen} />
              <Stack.Screen
                name={ROUTES.paywall}
                component={PaywallScreen}
                options={{ presentation: 'transparentModal', animation: 'fade' }}
              />
            </Stack.Group>
          )}
        </Stack.Navigator>
      </NavigationContainer>

      {/* Global premium-unlock sheet (driven by useUnlockPrompt from anywhere). */}
      <UnlockItemSheet />

      {/* Asked once, on first sign-in, before spending the user's data. */}
      <OfflineResourcesSheet
        visible={showAssetPrompt}
        totalBytes={assetPromptBytes}
        onDownload={() => { setShowAssetPrompt(false); acceptFirstRunDownload(); }}
        onOnDemand={() => { setShowAssetPrompt(false); chooseOnDemandOnly(); }}
        onLater={() => { setShowAssetPrompt(false); deferFirstRunDownload(); }}
      />

      {!isConnected ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <OfflineScreen onRetry={() => {}} />
        </View>
      ) : null}
    </View>
  );
}
