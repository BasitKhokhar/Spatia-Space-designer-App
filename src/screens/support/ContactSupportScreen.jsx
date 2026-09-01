import { useRef, useState } from 'react';
import { View, Pressable, ScrollView, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import HeaderBar from '@/components/ui/HeaderBar';
import Icon from '@/components/icons/Icon';
import SupportCategorySheet from '@/components/sheets/SupportCategorySheet';
import { useTheme } from '@/theme/useTheme';
import { accent } from '@/theme/colors';
import { useAuthStore } from '@/store/useAuthStore';
import { supportApi, SUPPORT_CATEGORY_MAP } from '@/services/api/supportApi';
import { isRemote } from '@/services/api/client';

// ---------------------------------------------------------------------------
// General "talk to a human" form, reachable from Settings > Help & Support.
// Distinct from the AI-report flow (ReportContentSheet) — this is the
// catch-all for billing, account, bug, and Play-policy concerns, and it has
// to reach a queue an admin actually reviews, not a mailto: link.
// ---------------------------------------------------------------------------
const MAX_MESSAGE = 2000;

export default function ContactSupportScreen({ navigation }) {
  const { colors, radius, shadows } = useTheme();
  const userEmail = useAuthStore((s) => s.user?.email);

  const [email, setEmail] = useState(userEmail || '');
  const [category, setCategory] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null);
  const [error, setError] = useState(null);

  const categorySheetRef = useRef(null);
  const openCategorySheet = () => setTimeout(() => categorySheetRef.current?.present(), 60);

  const canSubmit = email.trim() && category && message.trim() && !sending;

  const submit = async () => {
    if (!canSubmit) return;
    setSending(true);
    setError(null);
    try {
      const res = await supportApi.submit({ email: email.trim(), category, message: message.trim() });
      setSent(res?.id ?? true);
    } catch (e) {
      setError(
        e?.code === 'NO_BACKEND'
          ? 'Submitting a request needs an internet connection. Please try again when you are online.'
          : e?.message || 'That request could not be sent. Please try again.'
      );
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <Screen>
        <HeaderBar title="Contact Support" onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: colors.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="check" size={30} color={colors.accent} strokeWidth={2.2} />
          </View>
          <Text variant="title" align="center" style={{ marginTop: 20 }}>
            Request sent
          </Text>
          <Text variant="bodySm" color="ink2" align="center" style={{ marginTop: 10, lineHeight: 20 }}>
            Thanks — our team typically replies within 24 hours at the email you provided.
          </Text>
          {typeof sent === 'number' ? (
            <Text variant="label" color="ink3" style={{ marginTop: 14 }}>
              REFERENCE #{sent}
            </Text>
          ) : null}
          <Button title="Done" onPress={() => navigation.goBack()} style={{ marginTop: 28, width: '100%' }} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <HeaderBar title="Contact Support" onBack={() => navigation.goBack()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
      >
        <LinearGradient
          colors={[accent.a400, accent.a700]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[{ borderRadius: radius.xl, padding: 20, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 16 }, shadows.e3]}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: radius.md,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="shield" size={22} color="#fff" strokeWidth={1.9} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontFamily: 'Sora_700Bold', fontSize: 16 }}>We're here to help</Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2, lineHeight: 18 }}>
              Our team typically replies within 24 hours.
            </Text>
          </View>
        </LinearGradient>

        <View
          style={{
            marginTop: 20,
            backgroundColor: colors.surface,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.lineSoft,
            padding: 18,
          }}
        >
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            icon="mail"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text variant="label" color="ink2" style={{ marginTop: 18, marginBottom: 8, marginLeft: 2 }}>
            SUBJECT
          </Text>
          <Pressable
            onPress={openCategorySheet}
            style={{
              height: 54,
              backgroundColor: colors.surface2,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.line,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              gap: 12,
            }}
          >
            <Text
              style={{ flex: 1, fontSize: 15, color: category ? colors.ink : colors.ink3 }}
              numberOfLines={1}
            >
              {category ? SUPPORT_CATEGORY_MAP[category] : 'Select a category'}
            </Text>
            <Icon name="chevron-down" size={16} color={colors.ink3} strokeWidth={2} />
          </Pressable>

          <Text variant="label" color="ink2" style={{ marginTop: 18, marginBottom: 8, marginLeft: 2 }}>
            DETAILS
          </Text>
          <TextInput
            value={message}
            onChangeText={(t) => setMessage(t.slice(0, MAX_MESSAGE))}
            placeholder="Tell us what's going on…"
            placeholderTextColor={colors.ink3}
            multiline
            style={{
              minHeight: 140,
              textAlignVertical: 'top',
              padding: 14,
              borderRadius: radius.md,
              backgroundColor: colors.surface2,
              borderWidth: 1,
              borderColor: colors.line,
              color: colors.ink,
              fontSize: 14,
            }}
          />

          {error ? (
            <Text variant="bodySm" color="accent" style={{ marginTop: 14 }}>
              {error}
            </Text>
          ) : null}

          {!isRemote() ? (
            <Text variant="bodySm" color="ink3" style={{ marginTop: 14 }}>
              You need to be signed in and online to submit a request.
            </Text>
          ) : null}

          <Button
            title={sending ? 'Sending…' : 'Submit request'}
            onPress={submit}
            disabled={!canSubmit}
            style={{ marginTop: 22 }}
          />
        </View>
      </ScrollView>

      <SupportCategorySheet ref={categorySheetRef} value={category} onSelect={setCategory} />
    </Screen>
  );
}
