import { useState } from 'react';
import { View, Alert } from 'react-native';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import HeaderBar from '@/components/ui/HeaderBar';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { ROUTES } from '@/navigation/routes';
import { isRemote } from '@/services/api/client';
import { authApi } from '@/services/api/authApi';

export default function ForgotPasswordScreen({ navigation }) {
  const { colors, radius } = useTheme();
  const [email, setEmail] = useState('alex@studio.com');
  const [loading, setLoading] = useState(false);

  const onSend = async () => {
    setLoading(true);
    try {
      if (isRemote()) await authApi.forgotPasswordRequest(email);
      navigation.navigate(ROUTES.otp, { email });
    } catch (e) {
      Alert.alert('Could not send code', e?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen padded>
      <HeaderBar onBack={() => navigation.goBack()} style={{ paddingHorizontal: 0 }} />
      <View style={{ alignItems: 'center', marginTop: 32 }}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: radius.xxl,
            backgroundColor: colors.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="lock" size={44} color={colors.accent} strokeWidth={1.8} />
        </View>
        <Text variant="h1" align="center" style={{ marginTop: 32 }}>
          Forgot password?
        </Text>
        <Text variant="body" color="ink2" align="center" style={{ marginTop: 12 }}>
          No worries. Enter the email linked to your account and we&apos;ll send a secure reset link.
        </Text>
      </View>

      <View style={{ marginTop: 34 }}>
        <Input label="Email" icon="mail" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Button title="Send Reset Code" onPress={onSend} loading={loading} style={{ marginTop: 22 }} />
      </View>

      <Text
        variant="body"
        color="accent"
        align="center"
        style={{ marginTop: 'auto', marginBottom: 30, fontWeight: '700' }}
        onPress={() => navigation.goBack()}
      >
        Back to log in
      </Text>
    </Screen>
  );
}
