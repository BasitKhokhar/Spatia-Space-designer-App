import { useEffect, useState } from 'react';
import { View, ScrollView, Switch, Platform, Linking } from 'react-native';
import notifee, { AuthorizationStatus } from '@notifee/react-native';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import HeaderBar from '@/components/ui/HeaderBar';
import { RowDivider } from '@/components/ui/ListRow';
import { useTheme } from '@/theme/useTheme';
import { useSettingsStore } from '@/store/useSettingsStore';
import { isRemote } from '@/services/api/client';
import { registerForPushNotifications, unregisterPushNotifications } from '@/services/notifications/push';

// Categories are local-only for now (the backend has no per-category
// targeting yet — it only knows "this device wants push or it doesn't"). Each
// toggle just gates whether that category's notifications get shown in
// displayForeground()/the OS tray locally, via useSettingsStore.
const CATEGORIES = [
  { key: 'designUpdates', label: 'Design updates', hint: 'When an AI generation finishes or fails' },
  { key: 'creditsAndBilling', label: 'Credits & billing', hint: 'Low balance, ad rewards, subscription changes' },
  { key: 'tipsAndOffers', label: 'Tips & offers', hint: 'Occasional feature tips and promotions' },
];

function Row({ title, subtitle, value, onValueChange, disabled }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 }}>
      <View style={{ flex: 1 }}>
        <Text variant="bodySm" color={disabled ? 'ink3' : 'ink'} style={{ fontWeight: '600' }}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="ink3" style={{ marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.lineSoft, true: colors.accent }}
        thumbColor="#fff"
      />
    </View>
  );
}

export default function NotificationPreferencesScreen({ navigation }) {
  const { colors, radius } = useTheme();
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const setNotifications = useSettingsStore((s) => s.setNotifications);
  const categoryPrefs = useSettingsStore((s) => s.notificationCategories);
  const setCategoryPref = useSettingsStore((s) => s.setNotificationCategory);

  const [osBlocked, setOsBlocked] = useState(false);
  const [busy, setBusy] = useState(false);

  const checkOsPermission = () => {
    if (!isRemote()) return;
    notifee
      .getNotificationSettings()
      .then((settings) => setOsBlocked(settings.authorization === AuthorizationStatus.DENIED))
      .catch(() => {});
  };

  useEffect(() => {
    checkOsPermission();
  }, []);

  const handleMasterToggle = async (next) => {
    setBusy(true);
    try {
      if (next) {
        await registerForPushNotifications();
        checkOsPermission();
      } else {
        await unregisterPushNotifications();
      }
      setNotifications(next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <HeaderBar title="Notification Preferences" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 }}>
        <View
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.lineSoft,
            borderRadius: radius.xl,
            overflow: 'hidden',
            marginBottom: 20,
          }}
        >
          <Row
            title="Push Notifications"
            subtitle={isRemote() ? 'Get notified even when the app is closed' : 'Sign in to enable push notifications'}
            value={notificationsEnabled && isRemote()}
            disabled={!isRemote() || busy}
            onValueChange={handleMasterToggle}
          />
        </View>

        {osBlocked ? (
          <View
            style={{
              backgroundColor: colors.dangerSoftLight,
              borderWidth: 1,
              borderColor: colors.dangerBorderLight,
              borderRadius: radius.lg,
              padding: 14,
              marginBottom: 20,
            }}
          >
            <Text variant="bodySm" color="dangerDark" style={{ fontWeight: '600', marginBottom: 6 }}>
              Notifications are blocked in system settings
            </Text>
            <Text
              variant="caption"
              color="dangerDark"
              style={{ textDecorationLine: 'underline' }}
              onPress={() => (Platform.OS === 'ios' ? Linking.openURL('app-settings:') : Linking.openSettings())}
            >
              Open device settings
            </Text>
          </View>
        ) : null}

        <Text variant="caption" color="ink3" style={{ marginBottom: 8 }}>
          NOTIFY ME ABOUT
        </Text>
        <View
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.lineSoft,
            borderRadius: radius.xl,
            overflow: 'hidden',
          }}
        >
          {CATEGORIES.map((cat, i) => (
            <View key={cat.key}>
              {i > 0 ? <RowDivider /> : null}
              <Row
                title={cat.label}
                subtitle={cat.hint}
                value={notificationsEnabled && Boolean(categoryPrefs?.[cat.key])}
                disabled={!notificationsEnabled}
                onValueChange={(v) => setCategoryPref(cat.key, v)}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
