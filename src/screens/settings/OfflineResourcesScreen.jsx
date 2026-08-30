import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import Button from '@/components/ui/Button';
import HeaderBar from '@/components/ui/HeaderBar';
import ListRow, { RowDivider } from '@/components/ui/ListRow';
import ProgressBar from '@/components/ui/ProgressBar';
import SegmentedControl from '@/components/ui/SegmentedControl';
import { useTheme } from '@/theme/useTheme';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useCatalogStore } from '@/store/useCatalogStore';
import * as assetManager from '@/services/assets/assetManager';
import { startBulkDownload } from '@/services/assets/bootstrap';
import { TIERS, BUNDLED_TIER } from '@/services/assets/tiers';
import { evictSkiaImages } from '@/components/editor/skiaImageCache';
import { evictParsed } from '@/three/remoteModels';

function formatBytes(bytes) {
  if (!bytes) return '0 MB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

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

export default function OfflineResourcesScreen({ navigation }) {
  const { colors, radius } = useTheme();
  const items = useCatalogStore((s) => s.items);
  const policy = useSettingsStore((s) => s.assetDownloadPolicy);
  const setPolicy = useSettingsStore((s) => s.setAssetDownloadPolicy);

  const [queueState, setQueueState] = useState(() => assetManager.getState());
  const [version, setVersion] = useState(0); // forces a usage recompute after a clear

  useEffect(() => {
    assetManager.initAssets();
    return assetManager.subscribe(setQueueState);
  }, []);

  // Recomputed from the LIVE catalog, so whatever the server actually holds is
  // what gets quoted — 17 MB or 600 MB, nothing here is hardcoded.
  const usage = useMemo(() => assetManager.usageStats(items), [items, queueState.usedBytes, version]);

  const running = queueState.status === 'running';
  const paused = queueState.status === 'paused';
  const complete = usage.missingBytes === 0 && usage.requiredBytes > 0;

  const onPrimary = useCallback(() => {
    if (running) assetManager.pause();
    else if (paused) assetManager.resume();
    else startBulkDownload();
  }, [running, paused]);

  const confirmClear = () =>
    Alert.alert(
      'Clear downloaded files',
      'Removes downloaded 3D models and images. Assets used by your saved projects are kept, so those still open offline. Anything cleared re-downloads when you next need it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            const removed = assetManager.clearDownloads({ keepPinned: true });
            // Both render caches hold decoded copies of files we just deleted.
            evictSkiaImages();
            evictParsed();
            setVersion((v) => v + 1);
            Alert.alert('Cleared', `${removed} file(s) removed.`);
          },
        },
      ],
    );

  const primaryLabel = running
    ? 'Pause'
    : paused
      ? 'Resume'
      : complete
        ? 'Everything downloaded'
        : `Download everything (${formatBytes(usage.missingBytes)})`;

  return (
    <Screen edges={['top', 'bottom']}>
      <HeaderBar title="Offline resources" onBack={() => navigation.goBack()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
      >
        {/* Headline: the total is stated BEFORE any control, so the cost is
            never a surprise discovered mid-download. */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.lineSoft,
            borderRadius: radius.xl,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <Text variant="caption" color="ink3">FULL REALISM NEEDS</Text>
          <Text variant="h1" style={{ marginTop: 4 }}>{formatBytes(usage.requiredBytes)}</Text>
          <Text variant="bodySm" color="ink3" style={{ marginTop: 6 }}>
            {usage.requiredBytes === 0
              ? 'No downloadable resources published yet — the app is using its built-in artwork.'
              : `${formatBytes(usage.usedBytes)} downloaded (${Math.round(usage.pct * 100)}%) · ${formatBytes(usage.missingBytes)} remaining`}
          </Text>

          <ProgressBar value={usage.pct} style={{ marginTop: 14 }} />

          {(running || paused) && (
            <Text variant="label" color="ink3" style={{ marginTop: 10 }}>
              {paused
                ? 'Paused — resumes from where it stopped, even after restarting the app.'
                : `Downloading ${queueState.activeCount} file(s) · ${queueState.queuedCount} queued`}
            </Text>
          )}

          {usage.requiredBytes > 0 && (
            <Button
              title={primaryLabel}
              onPress={onPrimary}
              disabled={complete && !running && !paused}
              style={{ marginTop: 16 }}
            />
          )}
        </View>

        <Group title="WHAT YOU GET OFFLINE">
          <ListRow
            icon="shield"
            label={BUNDLED_TIER.label}
            value="Included"
            showChevron={false}
          />
          <RowDivider />
          {TIERS.map((tier, i) => {
            const bucket = usage.byKind?.[tier.kind];
            const have = bucket?.haveBytes || 0;
            const total = bucket?.bytes || 0;
            const done = total > 0 && have >= total;
            return (
              <View key={tier.kind}>
                <ListRow
                  icon={tier.icon}
                  label={tier.label}
                  value={total ? `${formatBytes(have)} / ${formatBytes(total)}` : '—'}
                  showChevron={false}
                  onPress={total && !done ? () => startBulkDownload([tier.kind]) : undefined}
                />
                <View style={{ paddingHorizontal: 16, paddingBottom: 12, marginTop: -6 }}>
                  <Text variant="label" color="ink3">
                    {done ? `✓ ${tier.unlocks} — available offline` : tier.unlocks}
                  </Text>
                </View>
                {i < TIERS.length - 1 && <RowDivider />}
              </View>
            );
          })}
        </Group>

        <Group title="DOWNLOAD OVER">
          <View style={{ padding: 16 }}>
            <SegmentedControl
              options={[
                { value: 'wifi', label: 'Wi-Fi only' },
                { value: 'always', label: 'Wi-Fi + data' },
                { value: 'off', label: 'Never' },
              ]}
              value={policy}
              onChange={(v) => {
                setPolicy(v);
                assetManager.setPolicy(v);
              }}
            />
            <Text variant="label" color="ink3" style={{ marginTop: 10 }}>
              {policy === 'wifi'
                ? 'Bulk downloads wait for Wi-Fi. An item you place in the editor still downloads right away, so you are never left waiting on it.'
                : policy === 'always'
                  ? 'Downloads use whatever connection is available, including mobile data.'
                  : 'Nothing downloads automatically. Items you place still fetch what they need.'}
            </Text>
          </View>
        </Group>

        {queueState.failed?.length > 0 && (
          <Group title="PROBLEMS">
            <ListRow
              icon="warning"
              label={`${queueState.failed.length} file(s) could not download`}
              value="Retry"
              onPress={() => assetManager.retryFailed()}
            />
          </Group>
        )}

        <Group title="STORAGE" danger>
          <ListRow
            icon="download"
            label="Used on this device"
            value={formatBytes(usage.usedBytes)}
            showChevron={false}
          />
          <RowDivider />
          <ListRow
            icon="shield"
            label="Kept for your saved projects"
            value={formatBytes(usage.pinnedBytes)}
            showChevron={false}
          />
          <RowDivider />
          <ListRow icon="trash" label="Clear downloaded files" danger showChevron={false} onPress={confirmClear} />
        </Group>
      </ScrollView>
    </Screen>
  );
}
