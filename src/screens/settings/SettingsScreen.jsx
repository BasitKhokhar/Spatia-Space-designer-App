import { useEffect, useMemo, useState } from 'react';
import { View, ScrollView } from 'react-native';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import HeaderBar from '@/components/ui/HeaderBar';
import ListRow, { RowDivider } from '@/components/ui/ListRow';
import SegmentedControl from '@/components/ui/SegmentedControl';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
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
import { useTabPadding } from '@/store/useAdLayout';
import { privacyOptionsRequired, showPrivacyOptionsForm, resetConsentForDebug } from '@/services/ads/consent';
import { getAdsModule } from '@/services/ads/state';

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
  // Only the tab copy sits under the floating tab bar / banner; the pushed
  // stack copy has neither.
  const tabPadding = useTabPadding(130);
  // UMP requires a persistent entry point back to the consent form, but only
  // where consent is actually regulated (EEA/UK and some US states). Elsewhere
  // the row would just be a confusing dead end, so it stays hidden.
  const [showAdPrivacy, setShowAdPrivacy] = useState(false);
  useEffect(() => {
    let alive = true;
    privacyOptionsRequired()
      .then((required) => {
        if (alive) setShowAdPrivacy(required);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
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

  // Entitlement snapshot for the "Subscription" row's value label — comes from
  // the server rather than any local store. Free/local users just show "Free".
  const [subscription, setSubscription] = useState(null);
  useEffect(() => {
    if (!isRemote()) return undefined;
    let alive = true;
    billingApi.myStatus()
      .then((s) => { if (alive) setSubscription(s); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const planLabel = subscription?.tier && subscription.tier !== 'free'
    ? (subscription.currentPlanCode || subscription.tier)
    : 'Free';

  const [logoutModal, setLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      setLogoutModal(false);
    }
  };

  const openLegalPage = (url, title) => navigation.navigate(ROUTES.legalWebView, { url, title });

  return (
    <Screen edges={isTab ? ['top'] : ['top', 'bottom']}>
      <HeaderBar title="Settings" onBack={isTab ? undefined : () => navigation.goBack()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: isTab ? tabPadding : 40 }}
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
          <ListRow icon="gem" label="Subscription" value={planLabel} onPress={() => navigation.navigate(ROUTES.subscription)} />
          <RowDivider />
          <ListRow icon="cart" label="Earn Credits" onPress={() => navigation.navigate(ROUTES.earnCredits)} />
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
          <ListRow icon="help" label="FAQs" onPress={() => navigation.navigate(ROUTES.faqs)} />
          <RowDivider />
          {showAdPrivacy ? (
            <>
              <ListRow
                icon="settings"
                label="Ad privacy settings"
                onPress={() => showPrivacyOptionsForm()}
              />
              <RowDivider />
            </>
          ) : null}
          <ListRow icon="shield" label="Privacy Policy" onPress={() => openLegalPage(LINKS.privacy, 'Privacy Policy')} />
          <RowDivider />
          <ListRow icon="file" label="Terms & Conditions" onPress={() => openLegalPage(LINKS.terms, 'Terms & Conditions')} />
        </Group>

        {__DEV__ ? (
          <Group title="DEVELOPER">
            <ListRow
              icon="search"
              label="Ad inspector"
              onPress={() => getAdsModule()?.default?.().openAdInspector?.()}
            />
            <RowDivider />
            <ListRow icon="eye" label="Reset ad consent" onPress={() => resetConsentForDebug()} />
          </Group>
        ) : null}

        <Group title="DANGER ZONE" danger>
          <ListRow icon="trash" label="Delete Account" danger onPress={() => setDeleteModal(true)} />
        </Group>

        <Text
          variant="bodySm"
          color="ink2"
          align="center"
          style={{ fontWeight: '700', paddingVertical: 8 }}
          onPress={() => setLogoutModal(true)}
        >
          Log Out
        </Text>
        <Text variant="bodySm" color="ink3" align="center" style={{ marginTop: 16 }}>
          HomePlanner v{APP_VERSION} (Build {BUILD_NUMBER})
        </Text>
      </ScrollView>

      <ConfirmationModal
        visible={logoutModal}
        icon="logout"
        title="Log out?"
        message="You'll need to sign in again to access your projects."
        confirmLabel="Log Out"
        cancelLabel="Cancel"
        danger
        loading={loggingOut}
        onConfirm={handleLogout}
        onClose={() => setLogoutModal(false)}
      />

      <ConfirmationModal
        visible={deleteModal}
        icon="trash"
        title="Delete your account?"
        message="This will permanently erase your projects, credits and export history. This cannot be undone."
        confirmLabel="Continue"
        cancelLabel="Cancel"
        danger
        onConfirm={() => {
          setDeleteModal(false);
          navigation.navigate(ROUTES.deleteAccount);
        }}
        onClose={() => setDeleteModal(false)}
      />
    </Screen>
  );
}
