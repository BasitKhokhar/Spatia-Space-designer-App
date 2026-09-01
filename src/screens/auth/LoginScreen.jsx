import { useState } from 'react';
import { View, Pressable, KeyboardAvoidingView, Platform, Alert } from 'react-native';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { LogoTile } from '@/components/graphics/Logo';
import { useTheme } from '@/theme/useTheme';
import { useAuthStore } from '@/store/useAuthStore';
import { signInWithGoogle } from '@/services/auth/social';
import { ROUTES } from '@/navigation/routes';

export default function LoginScreen({ navigation, route }) {
  const { colors, isDark } = useTheme();
  const login = useAuthStore((s) => s.login);
  const socialLogin = useAuthStore((s) => s.socialLogin);
  const [email, setEmail] = useState(route?.params?.email ?? 'alex@studio.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const onLogin = async () => {
    setLoading(true);
    try {
      await login(email, password);
      // RootNavigator swaps to the tab stack once isAuthenticated flips.
    } catch (e) {
      Alert.alert('Login failed', e?.message || 'Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const onGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (!result?.ok) {
        // Silent on user-initiated cancellation; surface anything else.
        if (result?.reason && result.reason !== 'cancelled') {
          Alert.alert('Sign-in failed', result.reason);
        }
        return;
      }
      await socialLogin('google', result?.idToken);
    } catch (e) {
      Alert.alert('Sign-in failed', e?.message || 'Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Screen scroll padded contentContainerStyle={{ paddingBottom: 40 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ paddingTop: 8 }}>
          <LogoTile size={56} tone={isDark ? 'accent' : 'ink'} />
          <Text variant="display" style={{ marginTop: 26 }}>
            Welcome back
          </Text>
          <Text variant="body" color="ink2" style={{ marginTop: 8 }}>
            Log in to pick up where you left off.
          </Text>
        </View>

        <View style={{ marginTop: 28, gap: 16 }}>
          <Input label="Email" icon="mail" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <Input label="Password" icon="lock" value={password} onChangeText={setPassword} secureTextEntry />
        </View>

        <Pressable
          onPress={() => navigation.navigate(ROUTES.forgot)}
          style={{ alignSelf: 'flex-end', marginTop: 12 }}
        >
          <Text variant="bodySm" color="accent" style={{ fontWeight: '700' }}>
            Forgot password?
          </Text>
        </Pressable>

        <Button title="Log In" onPress={onLogin} loading={loading} disabled={googleLoading} style={{ marginTop: 22 }} />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginVertical: 26 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
          <Text variant="bodySm" color="ink3">
            or continue with
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
        </View>

        <Button
          title="Continue with Google"
          icon="google"
          iconPosition="left"
          variant="secondary"
          onPress={onGoogleLogin}
          loading={googleLoading}
          disabled={loading}
        />

        <Text variant="body" color="ink2" align="center" style={{ marginTop: 32 }}>
          Don&apos;t have an account?{' '}
          <Text variant="body" color="accent" style={{ fontWeight: '700' }} onPress={() => navigation.navigate(ROUTES.signup)}>
            Sign up
          </Text>
        </Text>
      </KeyboardAvoidingView>
    </Screen>
  );
}
