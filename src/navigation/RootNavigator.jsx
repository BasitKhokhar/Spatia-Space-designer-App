import { View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useTheme } from '@/theme/useTheme';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { linking } from './linking';
import { ROUTES } from './routes';

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
import RoomTypeScreen from '@/screens/project/RoomTypeScreen';
import DimensionsScreen from '@/screens/project/DimensionsScreen';
import FloorPlanEditorScreen from '@/screens/editor/FloorPlanEditorScreen';
import ThreeDViewScreen from '@/screens/viewer/ThreeDViewScreen';
import CatalogScreen from '@/screens/catalog/CatalogScreen';
import ExportScreen from '@/screens/export/ExportScreen';
import EarnCreditsScreen from '@/screens/credits/EarnCreditsScreen';
import PaywallScreen from '@/screens/credits/PaywallScreen';
import SettingsScreen from '@/screens/settings/SettingsScreen';
import HelpSupportScreen from '@/screens/settings/HelpSupportScreen';
import DeleteAccountScreen from '@/screens/settings/DeleteAccountScreen';
// System
import OfflineScreen from '@/screens/system/OfflineScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { colors, isDark } = useTheme();
  const onboardingComplete = useSettingsStore((s) => s.onboardingComplete);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isConnected = useNetworkStatus();

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
      <NavigationContainer theme={navTheme} linking={linking}>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          {!onboardingComplete ? (
            <Stack.Group>
              <Stack.Screen name={ROUTES.splash} component={SplashScreen} />
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
              <Stack.Screen name={ROUTES.roomType} component={RoomTypeScreen} />
              <Stack.Screen name={ROUTES.dimensions} component={DimensionsScreen} />
              <Stack.Screen name={ROUTES.editor} component={FloorPlanEditorScreen} />
              <Stack.Screen name={ROUTES.view3d} component={ThreeDViewScreen} />
              <Stack.Screen name={ROUTES.catalog} component={CatalogScreen} />
              <Stack.Screen name={ROUTES.export} component={ExportScreen} />
              <Stack.Screen name={ROUTES.earnCredits} component={EarnCreditsScreen} />
              <Stack.Screen name={ROUTES.settings} component={SettingsScreen} />
              <Stack.Screen name={ROUTES.help} component={HelpSupportScreen} />
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

      {!isConnected ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <OfflineScreen onRetry={() => {}} />
        </View>
      ) : null}
    </View>
  );
}
