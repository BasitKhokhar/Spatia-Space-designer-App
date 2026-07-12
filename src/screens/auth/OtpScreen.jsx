import { useEffect, useRef, useState } from 'react';
import { View, TextInput, Pressable, Alert } from 'react-native';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import HeaderBar from '@/components/ui/HeaderBar';
import { useTheme } from '@/theme/useTheme';
import { ROUTES } from '@/navigation/routes';
import { isRemote } from '@/services/api/client';
import { authApi } from '@/services/api/authApi';

const LENGTH = 6;

export default function OtpScreen({ navigation, route }) {
  const { colors, radius, fonts } = useTheme();
  const email = route.params?.email || 'alex@studio.com';
  const [code, setCode] = useState('');
  const [seconds, setSeconds] = useState(42);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState('otp'); // 'otp' | 'reset'
  const [resetToken, setResetToken] = useState(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const digits = code.padEnd(LENGTH, ' ').split('').slice(0, LENGTH);
  const activeIndex = Math.min(code.length, LENGTH - 1);

  const onVerify = async () => {
    setLoading(true);
    try {
      if (isRemote()) {
        const { resetToken: token } = await authApi.forgotPasswordVerify(email, code);
        setResetToken(token);
        setStage('reset');
      } else {
        // Local/demo mode — nothing to verify against.
        navigation.navigate(ROUTES.login);
      }
    } catch (e) {
      Alert.alert('Invalid code', e?.message || 'Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (seconds > 0) return;
    try {
      if (isRemote()) await authApi.forgotPasswordRequest(email);
      setSeconds(42);
    } catch (e) {
      Alert.alert('Could not resend', e?.message || 'Please try again.');
    }
  };

  const onReset = async () => {
    if (password.length < 8) return Alert.alert('Weak password', 'Use at least 8 characters.');
    if (password !== confirm) return Alert.alert('Mismatch', 'Passwords do not match.');
    setLoading(true);
    try {
      await authApi.forgotPasswordReset(resetToken, password);
      Alert.alert('Password updated', 'You can now log in with your new password.');
      navigation.navigate(ROUTES.login);
    } catch (e) {
      Alert.alert('Reset failed', e?.message || 'Please start again.');
    } finally {
      setLoading(false);
    }
  };

  if (stage === 'reset') {
    return (
      <Screen padded>
        <HeaderBar onBack={() => setStage('otp')} style={{ paddingHorizontal: 0 }} />
        <View style={{ alignItems: 'center', marginTop: 32 }}>
          <Text variant="h1" align="center">Set a new password</Text>
          <Text variant="body" color="ink2" align="center" style={{ marginTop: 12 }}>
            Choose a new password for{'\n'}
            <Text variant="body" color="ink" style={{ fontWeight: '700' }}>{email}</Text>
          </Text>
        </View>
        <View style={{ marginTop: 34, gap: 14 }}>
          <Input label="New password" icon="lock" value={password} onChangeText={setPassword} secureTextEntry />
          <Input label="Confirm password" icon="lock" value={confirm} onChangeText={setConfirm} secureTextEntry />
        </View>
        <Button title="Update Password" onPress={onReset} loading={loading} style={{ marginTop: 22 }} />
      </Screen>
    );
  }

  return (
    <Screen padded>
      <HeaderBar onBack={() => navigation.goBack()} style={{ paddingHorizontal: 0 }} />
      <View style={{ alignItems: 'center', marginTop: 32 }}>
        <Text variant="h1" align="center">Verify your email</Text>
        <Text variant="body" color="ink2" align="center" style={{ marginTop: 12 }}>
          Enter the 6-digit code we sent to{'\n'}
          <Text variant="body" color="ink" style={{ fontWeight: '700' }}>{email}</Text>
        </Text>
      </View>

      <Pressable
        onPress={() => inputRef.current?.focus()}
        style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 40 }}
      >
        {digits.map((d, i) => {
          const filled = d.trim() !== '';
          const active = i === activeIndex;
          return (
            <View
              key={i}
              style={{
                width: 48,
                height: 60,
                borderRadius: radius.md,
                backgroundColor: colors.surface,
                borderWidth: 1.5,
                borderColor: active ? colors.accent : colors.line,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.ink }}>{filled ? d : ''}</Text>
            </View>
          );
        })}
      </Pressable>

      <TextInput
        ref={inputRef}
        value={code}
        onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, LENGTH))}
        keyboardType="number-pad"
        maxLength={LENGTH}
        autoFocus
        style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }}
      />

      <Pressable onPress={onResend} disabled={seconds > 0}>
        <Text variant="bodySm" color="ink2" align="center" style={{ marginTop: 32 }}>
          {seconds > 0 ? (
            <>Didn&apos;t get it? Resend in <Text variant="bodySm" color="ink" style={{ fontWeight: '700' }}>0:{seconds.toString().padStart(2, '0')}</Text></>
          ) : (
            <Text variant="bodySm" color="accent" style={{ fontWeight: '700' }}>Resend code</Text>
          )}
        </Text>
      </Pressable>

      <Button title="Verify" onPress={onVerify} loading={loading} disabled={code.length < LENGTH} style={{ marginTop: 22 }} />
    </Screen>
  );
}
