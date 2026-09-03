import { useEffect, useState } from 'react';
import { View, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import Text from '@/components/ui/Text';
import Icon from '@/components/icons/Icon';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import ChangePasswordModal from '@/components/profile/ChangePasswordModal';
import { useTheme } from '@/theme/useTheme';
import { useAuthStore } from '@/store/useAuthStore';
import { accent } from '@/theme/colors';

// Read-only field styled like Input, for values that can't be edited here
// (email is the unique login key; password has its own change flow).
function LockedField({ label, value, rightSlot }) {
  const { colors, radius, fonts } = useTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      <Text variant="label" color="ink2" style={{ marginBottom: 8, marginLeft: 2 }}>
        {label}
      </Text>
      <View
        style={{
          height: 54,
          backgroundColor: colors.bg,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.line,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
        }}
      >
        <Text style={{ flex: 1, fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink3 }} numberOfLines={1}>
          {value}
        </Text>
        {rightSlot}
      </View>
    </View>
  );
}

function ChangeChip({ onPress }) {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={{
        backgroundColor: colors.accentSoft,
        borderRadius: radius.sm,
        paddingHorizontal: 12,
        paddingVertical: 7,
      }}
    >
      <Text variant="bodySm" color="accent" style={{ fontWeight: '700' }}>
        Change
      </Text>
    </Pressable>
  );
}

export default function ProfileScreen({ navigation }) {
  const { colors, radius } = useTheme();
  const user = useAuthStore((s) => s.user);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    let alive = true;
    refreshProfile()
      .then((fresh) => {
        if (!alive) return;
        setName(fresh?.name || '');
        setPhone(fresh?.phone || '');
      })
      .catch(() => {})
      .finally(() => alive && setLoadingProfile(false));
    return () => {
      alive = false;
    };
  }, []);

  const handleSaveProfile = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile({ name: trimmedName, phone: phone.trim() });
      Alert.alert('Profile updated', 'Your details have been saved.');
    } catch (e) {
      Alert.alert('Update failed', e?.message || 'Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            paddingHorizontal: 24,
            paddingTop: 8,
          }}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={8}
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.md,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.line,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="chevron-left" size={20} color={colors.ink} strokeWidth={2.2} />
          </Pressable>
          <Text variant="h2">Profile</Text>
        </View>

        <View
          style={{
            marginHorizontal: 24,
            marginTop: 24,
            backgroundColor: colors.surface,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.lineSoft,
            padding: 20,
          }}
        >
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <LinearGradient
              colors={[accent.a400, accent.a700]}
              style={{ width: 84, height: 84, borderRadius: 26, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#fff', fontFamily: 'Sora_700Bold', fontSize: 30 }}>{user?.initial || 'A'}</Text>
            </LinearGradient>
          </View>

          <Input label="Name" value={name} onChangeText={setName} placeholder="Your name" icon="user" style={{ marginBottom: 14 }} />

          <LockedField label="Email" value={user?.email || ''} />

          <Input
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            placeholder="Add a phone number"
            keyboardType="phone-pad"
            style={{ marginBottom: 14 }}
          />

          <LockedField label="Password" value="••••••••" rightSlot={<ChangeChip onPress={() => setShowPasswordModal(true)} />} />

          <Button
            title="Save Changes"
            onPress={handleSaveProfile}
            loading={savingProfile}
            disabled={loadingProfile}
            style={{ marginTop: 4 }}
          />
        </View>
      </ScrollView>

      <ChangePasswordModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={() => {
          setShowPasswordModal(false);
          Alert.alert('Password updated', 'Your password has been changed successfully.');
        }}
      />
    </SafeAreaView>
  );
}
