import { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, Pressable, Alert } from 'react-native';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import HeaderBar from '@/components/ui/HeaderBar';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { useAuthStore } from '@/store/useAuthStore';
import { ROUTES } from '@/navigation/routes';
import { LINKS } from '@/constants/links';

export default function SignupScreen({ navigation }) {
  const { colors, radius } = useTheme();
  const signup = useAuthStore((s) => s.signup);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit = name && email && password && password === confirm && agree;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await signup(name, email, password);
      // Account created but intentionally not signed in — send the user to Login
      // so they authenticate with their new credentials (prefill their email).
      Alert.alert('Account created', 'Please log in to continue.');
      navigation.navigate(ROUTES.login, { email });
    } catch (e) {
      Alert.alert('Sign up failed', e?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll padded contentContainerStyle={{ paddingBottom: 40 }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <HeaderBar onBack={() => navigation.goBack()} style={{ paddingHorizontal: 0, marginBottom: 8 }} />
        <Text variant="display">Create account</Text>
        <Text variant="body" color="ink2" style={{ marginTop: 8 }}>
          Start designing your first space today.
        </Text>

        <View style={{ marginTop: 24, gap: 14 }}>
          <Input label="Full name" icon="user" value={name} onChangeText={setName} placeholder="Alex Rivera" autoCapitalize="words" />
          <Input label="Email" icon="mail" value={email} onChangeText={setEmail} placeholder="you@email.com" keyboardType="email-address" />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry style={{ flex: 1 }} />
            <Input label="Confirm" value={confirm} onChangeText={setConfirm} secureTextEntry style={{ flex: 1 }} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 20 }}>
          <Pressable
            hitSlop={10}
            onPress={() => setAgree((a) => !a)}
            style={{
              width: 24,
              height: 24,
              borderRadius: 7,
              backgroundColor: agree ? colors.accent : 'transparent',
              borderWidth: agree ? 0 : 1.5,
              borderColor: colors.line,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 1,
            }}
          >
            {agree ? <Icon name="check" size={14} color={colors.onAccent} strokeWidth={2.6} /> : null}
          </Pressable>
          <Text variant="bodySm" color="ink2" style={{ flex: 1, lineHeight: 20 }}>
            I agree to the{' '}
            <Text
              variant="bodySm"
              color="accent"
              style={{ fontWeight: '700' }}
              onPress={() => navigation.navigate(ROUTES.legalWebView, { url: LINKS.terms, title: 'Terms of Service' })}
            >
              Terms of Service
            </Text>{' '}
            and{' '}
            <Text
              variant="bodySm"
              color="accent"
              style={{ fontWeight: '700' }}
              onPress={() => navigation.navigate(ROUTES.legalWebView, { url: LINKS.privacy, title: 'Privacy Policy' })}
            >
              Privacy Policy
            </Text>
            .
          </Text>
        </View>

        <Button
          title="Create Account"
          onPress={onSubmit}
          loading={loading}
          disabled={!canSubmit}
          style={{ marginTop: 24 }}
        />

        <Text variant="body" color="ink2" align="center" style={{ marginTop: 24 }}>
          Already have an account?{' '}
          <Text variant="body" color="accent" style={{ fontWeight: '700' }} onPress={() => navigation.goBack()}>
            Log in
          </Text>
        </Text>
      </KeyboardAvoidingView>
    </Screen>
  );
}
