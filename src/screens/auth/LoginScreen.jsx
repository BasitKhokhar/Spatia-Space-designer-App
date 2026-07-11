import { useState } from 'react';
import { View, Pressable, KeyboardAvoidingView, Platform } from 'react-native';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Icon from '@/components/icons/Icon';
import { LogoTile } from '@/components/graphics/Logo';
import { useTheme } from '@/theme/useTheme';
import { useAuthStore } from '@/store/useAuthStore';
import { signInWithGoogle, signInWithApple } from '@/services/auth/social';
import { ROUTES } from '@/navigation/routes';

function SocialButton({ icon, label, onPress }) {
  const { colors, radius, fonts } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        height: 52,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radius.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
      }}
    >
      <Icon name={icon} size={18} color={colors.ink} />
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink }}>{label}</Text>
    </Pressable>
  );
}

export default function LoginScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const login = useAuthStore((s) => s.login);
  const socialLogin = useAuthStore((s) => s.socialLogin);
  const [email, setEmail] = useState('alex@studio.com');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    setLoading(true);
    await login(email, password);
    // RootNavigator swaps to the tab stack once isAuthenticated flips.
  };

  const onSocial = async (provider) => {
    if (provider === 'google') await signInWithGoogle();
    else await signInWithApple();
    await socialLogin(provider);
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

        <Button title="Log In" onPress={onLogin} loading={loading} style={{ marginTop: 22 }} />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginVertical: 26 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
          <Text variant="bodySm" color="ink3">
            or continue with
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <SocialButton icon="google" label="Google" onPress={() => onSocial('google')} />
          <SocialButton icon="apple" label="Apple" onPress={() => onSocial('apple')} />
        </View>

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
