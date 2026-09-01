import { useRef, useState } from 'react';
import { View, Pressable, ActivityIndicator, Linking, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import Button from '@/components/ui/Button';
import ProgressBar from '@/components/ui/ProgressBar';
import HeaderBar from '@/components/ui/HeaderBar';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';

// In-app browser for external legal/support pages (Privacy Policy, Terms &
// Conditions, etc.) so the user never has to leave the app. Takes
// { url, title } route params. Mirrors the branded loading/error treatment
// used elsewhere in the app rather than a bare WebView.
export default function LegalWebViewScreen({ navigation, route }) {
  const { url, title = 'Legal' } = route?.params ?? {};
  const { colors, radius } = useTheme();
  const webViewRef = useRef(null);

  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const reload = () => {
    setFailed(false);
    setLoading(true);
    setProgress(0);
    webViewRef.current?.reload();
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <HeaderBar
        title={title}
        onBack={() => navigation.goBack()}
        right={
          <Pressable
            onPress={reload}
            hitSlop={8}
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.md,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.line,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="rotate" size={18} color={colors.ink} strokeWidth={2} />
          </Pressable>
        }
      />

      {loading && !failed ? (
        <ProgressBar value={progress} height={2.5} style={{ borderRadius: 0 }} track="transparent" />
      ) : null}

      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        {failed ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 14 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: radius.xxl,
                backgroundColor: colors.accentSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="wifi-off" size={28} color={colors.accent} strokeWidth={1.8} />
            </View>
            <Text variant="title" align="center">
              Unable to load page
            </Text>
            <Text variant="bodySm" color="ink3" align="center" style={{ lineHeight: 20 }}>
              Check your internet connection and try again.
            </Text>
            <Button title="Try Again" icon="rotate" iconPosition="left" onPress={reload} fullWidth={false} style={{ paddingHorizontal: 32, marginTop: 6 }} />
          </View>
        ) : (
          <WebView
            ref={webViewRef}
            source={{ uri: url }}
            style={{ flex: 1, backgroundColor: colors.surface }}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
            onLoadEnd={() => {
              setLoading(false);
              setProgress(1);
            }}
            onError={() => {
              setFailed(true);
              setLoading(false);
            }}
            onHttpError={() => {
              setFailed(true);
              setLoading(false);
            }}
            renderLoading={() => (
              <View
                style={[
                  StyleSheet.absoluteFillObject,
                  { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
                ]}
              >
                <ActivityIndicator size="large" color={colors.accent} />
              </View>
            )}
          />
        )}
      </View>

      {!failed ? (
        <Pressable
          onPress={() => url && Linking.openURL(url).catch(() => {})}
          style={{ paddingVertical: 14, alignItems: 'center' }}
        >
          <Text variant="bodySm" color="ink3">
            Open in browser
          </Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}
