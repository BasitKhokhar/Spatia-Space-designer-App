import { useState } from 'react';
import { View } from 'react-native';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import HeaderBar from '@/components/ui/HeaderBar';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { ROUTES } from '@/navigation/routes';

export default function ForgotPasswordScreen({ navigation }) {
  const { colors, radius } = useTheme();
  const [email, setEmail] = useState('alex@studio.com');

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
        <Button
          title="Send Reset Link"
          onPress={() => navigation.navigate(ROUTES.otp, { email })}
          style={{ marginTop: 22 }}
        />
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
