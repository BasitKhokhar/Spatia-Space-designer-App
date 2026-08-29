import { useEffect, useMemo, useState } from 'react';
import { Linking, View, ScrollView, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import HeaderBar from '@/components/ui/HeaderBar';
import ListRow, { RowDivider } from '@/components/ui/ListRow';
import SegmentedControl from '@/components/ui/SegmentedControl';
import { useTheme } from '@/theme/useTheme';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useCatalogStore } from '@/store/useCatalogStore';
import * as assetManager from '@/services/assets/assetManager';
import { useAuthStore } from '@/store/useAuthStore';
import { isRemote } from '@/services/api/client';
import { billingApi } from '@/services/api/billingApi';
import { APP_VERSION, BUILD_NUMBER } from '@/constants/config';
import { LINKS } from '@/constants/links';
import { ROUTES } from '@/navigation/routes';

function Group({ title, danger, children }) {
  const { colors, radius } = useTheme();
  return (
    <View style={{ marginBottom: 20 }}>
      <Text variant="caption" color={danger ? 'dangerDark' : 'ink3'} style={{ marginBottom: 8 }}>
        {title}
      </Text>
      <View
        style={{
          backgroundColor: danger ? colors.dangerSoftLight : colors.surface,
          borderWidth: 1,
          borderColor: danger ? colors.dangerBorderLight : colors.lineSoft,
          borderRadius: radius.xl,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </View>
  );
}

export default function SettingsScreen({ navigation, route }) {
  const { colors } = useTheme();
  // Mounted as the last tab (no back button, clears the floating tab bar) or
  // pushed on the stack from Profile / the editor (normal back header).
  const isTab = route?.name === ROUTES.settingsTab;
  const themePreference = useSettingsStore((s) => s.themePreference);
  const setThemePreference = useSettingsStore((s) => s.setThemePreference);
  const measurementUnit = useSettingsStore((s) => s.measurementUnit);
  const setMeasurementUnit = useSettingsStore((s) => s.setMeasurementUnit);
  const language = useSettingsStore((s) => s.language);
  const logout = useAuthStore((s) => s.logout);

  // Live "downloaded / total" summary on the row, so the state of the offline
  // library is visible without opening the screen.
  const catalogItems = useCatalogStore((s) => s.items);
  const [assetState, setAssetState] = useState(() => assetManager.getState());
  useEffect(() => assetManager.subscribe(setAssetState), []);
  const offlineValue = useMemo(() => {
    const usage = assetManager.usageStats(catalogItems);
    if (!usage.requiredBytes) return 'Built-in only';
    const mb = (n) => `${(n / 1048576).toFixed(n > 10485760 ? 0 : 1)} MB`;
    if (assetState.status === 'running') return `${Math.round(usage.pct * 100)}% · downloading`;
    return `${mb(usage.usedBytes)} / ${mb(usage.requiredBytes)}`;
  }, [catalogItems, assetState.status, assetState.usedBytes]);

  // The licence key belongs to the active subscription (a Play purchase or an
  // admin grant), so it comes from the server rather than any local store.
  // Free users have none and the row stays hidden.
  const [subscription, setSubscription] = useState(null);
  useEffect(() => {
    if (!isRemote()) return undefined;
    let alive = true;
    billingApi.myStatus()
      .then((s) => { if (alive) setSubscription(s); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const copyLicenseKey = async () => {
    if (!subscription?.licenseKey) return;
    await Clipboard.setStringAsync(subscription.licenseKey);
    Alert.alert('Copied', 'Your licence key is on the clipboard.');
  };

  const confirmLogout = () =>
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);

  return (
    <Screen edges={isTab ? ['top'] : ['top', 'bottom']}>
      <HeaderBar title="Settings" onBack={isTab ? undefined : () => navigation.goBack()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: isTab ? 130 : 40 }}
      >
        <Group title="ACCOUNT">
          <ListRow icon="user" label="Profile" onPress={() => navigation.navigate(ROUTES.profile)} />
          <RowDivider />
          <ListRow
            icon="grid"
            label="My Projects"
            onPress={() => navigation.navigate(ROUTES.tabs, { screen: ROUTES.projects })}
          />
          <RowDivider />
          <ListRow icon="upload" label="Export History" onPress={() => navigation.navigate(ROUTES.export)} />
          <RowDivider />
          <ListRow icon="cart" label="Credits & Plans" onPress={() => navigation.navigate(ROUTES.earnCredits)} />
          <RowDivider />
          {subscription?.licenseKey ? (
            <>
              <ListRow
                icon="check"
                label="Your licence"
                value={subscription.licenseKey}
                showChevron={false}
                onPress={copyLicenseKey}
              />
              <RowDivider />
            </>
          ) : null}
          <ListRow icon="bell" label="Notification Preferences" onPress={() => {}} />
        </Group>

        <Group title="APPEARANCE">
          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 12 }}>
              <Text variant="bodySm" style={{ fontWeight: '600' }}>
                Theme
              </Text>
            </View>
            <SegmentedControl
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'system', label: 'System' },
              ]}
              value={themePreference}
              onChange={setThemePreference}
            />
          </View>
          <RowDivider />
          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 12 }}>
              <Text variant="bodySm" style={{ fontWeight: '600' }}>
                Measurement unit
              </Text>
            </View>
            <SegmentedControl
              options={[
                { value: 'meters', label: 'Meters' },
                { value: 'feet', label: 'Feet' },
              ]}
              value={measurementUnit}
              onChange={setMeasurementUnit}
            />
          </View>
          <RowDivider />
          <ListRow icon="globe" label="Language" value={language} onPress={() => {}} />
        </Group>

        <Group title="STORAGE">
          <ListRow
            icon="download"
            label="Offline resources"
            value={offlineValue}
            onPress={() => navigation.navigate(ROUTES.offlineResources)}
          />
        </Group>

        <Group title="SUPPORT & LEGAL">
          <ListRow icon="star" label="Rate the App" onPress={() => {}} />
          <RowDivider />
          <ListRow icon="share" label="Share App" onPress={() => {}} />
          <RowDivider />
          <ListRow icon="help" label="Help & Support" onPress={() => navigation.navigate(ROUTES.help)} />
          <RowDivider />
          <ListRow icon="shield" label="Privacy Policy" onPress={() => Linking.openURL(LINKS.privacy)} />
          <RowDivider />
          <ListRow icon="file" label="Terms & Conditions" onPress={() => Linking.openURL(LINKS.terms)} />
        </Group>

        <Group title="DANGER ZONE" danger>
          <ListRow icon="trash" label="Delete Account" danger onPress={() => navigation.navigate(ROUTES.deleteAccount)} />
        </Group>

        <Text
          variant="bodySm"
          color="ink2"
          align="center"
          style={{ fontWeight: '700', paddingVertical: 8 }}
          onPress={confirmLogout}
        >
          Log Out
        </Text>
        <Text variant="bodySm" color="ink3" align="center" style={{ marginTop: 16 }}>
          HomePlanner v{APP_VERSION} (Build {BUILD_NUMBER})
        </Text>
      </ScrollView>
    </Screen>
  );
}
