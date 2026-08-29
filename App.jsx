import { useCallback, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { ThemeProvider } from '@/theme/ThemeProvider';
import { useAppFonts } from '@/theme/useAppFonts';
import RootNavigator from '@/navigation/RootNavigator';
import AppErrorBoundary from '@/components/AppErrorBoundary';
import { initMonetization } from '@/services/ads/admob';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Diagnostic-only: log any error that reaches RN's global handler (i.e. one
// AppErrorBoundary's render-phase catch didn't see — effects, timers, native
// callbacks) before falling through to the default behavior, so a crash isn't
// silent even when it happens outside a React error boundary.
if (typeof ErrorUtils !== 'undefined' && typeof ErrorUtils.setGlobalHandler === 'function') {
  const defaultHandler = ErrorUtils.getGlobalHandler?.();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('[app] global uncaught error', { isFatal, error: error?.message || error, stack: error?.stack });
    defaultHandler?.(error, isFatal);
  });
}

export default function App() {
  const { fontsLoaded, fontError } = useAppFonts();

  useEffect(() => {
    // Fire-and-forget: consent + ads SDK init. Never blocks the UI.
    // Google Play Billing needs no app-level init — expo-iap's useIAP hook
    // opens and closes the store connection with the paywall screen.
    initMonetization().catch(() => {});
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AppErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <SafeAreaProvider>
          <ThemeProvider>
            <BottomSheetModalProvider>
              <StatusBar style="auto" />
              <RootNavigator />
            </BottomSheetModalProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );
}
