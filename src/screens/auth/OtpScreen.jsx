import { useEffect, useRef, useState } from 'react';
import { View, TextInput, Pressable } from 'react-native';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import Button from '@/components/ui/Button';
import HeaderBar from '@/components/ui/HeaderBar';
import { useTheme } from '@/theme/useTheme';
import { ROUTES } from '@/navigation/routes';

const LENGTH = 6;

export default function OtpScreen({ navigation, route }) {
  const { colors, radius, fonts } = useTheme();
  const email = route.params?.email || 'alex@studio.com';
  const [code, setCode] = useState('492');
  const [seconds, setSeconds] = useState(42);
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const digits = code.padEnd(LENGTH, ' ').split('').slice(0, LENGTH);
  const activeIndex = Math.min(code.length, LENGTH - 1);

  return (
    <Screen padded>
      <HeaderBar onBack={() => navigation.goBack()} style={{ paddingHorizontal: 0 }} />
      <View style={{ alignItems: 'center', marginTop: 32 }}>
        <Text variant="h1" align="center">
          Verify your email
        </Text>
        <Text variant="body" color="ink2" align="center" style={{ marginTop: 12 }}>
          Enter the 6-digit code we sent to{'\n'}
          <Text variant="body" color="ink" style={{ fontWeight: '700' }}>
            {email}
          </Text>
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
              <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.ink }}>
                {filled ? d : ''}
              </Text>
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

      <Text variant="bodySm" color="ink2" align="center" style={{ marginTop: 32 }}>
        Didn&apos;t get it? Resend in{' '}
        <Text variant="bodySm" color="ink" style={{ fontWeight: '700' }}>
          0:{seconds.toString().padStart(2, '0')}
        </Text>
      </Text>

      <Button
        title="Verify"
        onPress={() => navigation.navigate(ROUTES.login)}
        disabled={code.length < LENGTH}
        style={{ marginTop: 22 }}
      />
    </Screen>
  );
}
