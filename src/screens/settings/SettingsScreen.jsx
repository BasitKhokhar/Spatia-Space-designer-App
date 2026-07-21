import { Linking, View, ScrollView, Alert } from 'react-native';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import HeaderBar from '@/components/ui/HeaderBar';
import ListRow, { RowDivider } from '@/components/ui/ListRow';
import SegmentedControl from '@/components/ui/SegmentedControl';
import { useTheme } from '@/theme/useTheme';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAuthStore } from '@/store/useAuthStore';
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

export default function SettingsScreen({ navigation }) {
  const { colors } = useTheme();
  const themePreference = useSettingsStore((s) => s.themePreference);
  const setThemePreference = useSettingsStore((s) => s.setThemePreference);
  const measurementUnit = useSettingsStore((s) => s.measurementUnit);
  const setMeasurementUnit = useSettingsStore((s) => s.setMeasurementUnit);
  const language = useSettingsStore((s) => s.language);
  const logout = useAuthStore((s) => s.logout);

  const confirmLogout = () =>
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);

  return (
    <Screen>
      <HeaderBar title="Settings" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <Group title="ACCOUNT">
          <ListRow icon="user" label="Edit Profile" onPress={() => {}} />
          <RowDivider />
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
