import { useState } from 'react';
import { View, TextInput } from 'react-native';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import Button from '@/components/ui/Button';
import HeaderBar from '@/components/ui/HeaderBar';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';
import { useAuthStore } from '@/store/useAuthStore';
import { useProjectsStore } from '@/store/useProjectsStore';
import { useCreditsStore } from '@/store/useCreditsStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { clearAllStorage } from '@/store/storage';

function Bullet({ icon, children }) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.lineSoft,
        borderRadius: radius.md,
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Icon name={icon} size={18} color={colors.dangerDark} strokeWidth={1.8} />
      <Text variant="bodySm" color="ink" style={{ flex: 1, fontWeight: '600' }}>
        {children}
      </Text>
    </View>
  );
}

export default function DeleteAccountScreen({ navigation }) {
  const { colors, radius, fonts } = useTheme();
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const resetProjects = useProjectsStore((s) => s.reset);
  const resetCredits = useCreditsStore((s) => s.reset);
  const resetSettings = useSettingsStore((s) => s.reset);
  const projects = useProjectsStore((s) => s.projects);

  const canDelete = confirm.trim().toUpperCase() === 'DELETE';

  const onDelete = async () => {
    setBusy(true);
    // Calls the backend account-deletion endpoint (soft-delete + token revoke)
    // when remote, then wipes local state. Play policy also requires a
    // web-accessible deletion path — served by the backend's legal pages.
    try {
      await deleteAccount();
    } finally {
      resetProjects();
      resetCredits();
      resetSettings();
      clearAllStorage();
    }
  };

  return (
    <Screen>
      <HeaderBar onBack={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: 24, flex: 1 }}>
        <View style={{ alignItems: 'center', marginTop: 24 }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: radius.xxl,
              backgroundColor: colors.dangerSoftLight,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="warning" size={40} color={colors.dangerDark} strokeWidth={1.8} />
          </View>
          <Text variant="h1" align="center" style={{ marginTop: 22 }}>
            Delete your account?
          </Text>
          <Text variant="body" color="ink2" align="center" style={{ marginTop: 10 }}>
            This action is permanent and cannot be undone.
          </Text>
        </View>

        <View style={{ gap: 11, marginTop: 24 }}>
          <Bullet icon="grid">All {projects.length} projects and floor plans will be permanently erased</Bullet>
          <Bullet icon="upload">Your export history and saved credits will be lost</Bullet>
          <Bullet icon="close">This cannot be reversed once confirmed</Bullet>
        </View>

        <View
          style={{
            marginTop: 24,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: radius.md,
            height: 52,
            justifyContent: 'center',
            paddingHorizontal: 16,
          }}
        >
          <TextInput
            value={confirm}
            onChangeText={setConfirm}
            placeholder='Type "DELETE" to confirm'
            placeholderTextColor={colors.ink3}
            autoCapitalize="characters"
            style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: colors.ink }}
          />
        </View>

        <View style={{ marginTop: 'auto', marginBottom: 34, gap: 12 }}>
          <Button title="Permanently Delete Account" variant="danger" disabled={!canDelete} loading={busy} onPress={onDelete} />
          <Button title="Cancel" variant="secondary" onPress={() => navigation.goBack()} />
        </View>
      </View>
    </Screen>
  );
}
