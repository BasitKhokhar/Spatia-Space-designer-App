import { Modal, Pressable, View } from 'react-native';

import Text from '@/components/ui/Text';
import Button from '@/components/ui/Button';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';

function formatBytes(bytes) {
  if (!bytes) return '0 MB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

// Asked exactly once, on the first sign-in. From then on the answer is stored
// and downloading starts automatically without ever prompting again.
//
// The alternative — silently pulling the whole library the moment someone logs
// in — is how an app ends up accused of eating a data plan. One tap buys the
// consent and the behaviour is identical thereafter.
export default function OfflineResourcesSheet({ visible, totalBytes, onDownload, onLater, onOnDemand }) {
  const { colors, radius, shadows } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onLater}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={onLater} />
      <View
        style={[
          {
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.xxl,
            borderTopRightRadius: radius.xxl,
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 34,
          },
          shadows?.e3,
        ]}
      >
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: radius.xl,
            backgroundColor: colors.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <Icon name="download" size={24} color={colors.accent} />
        </View>

        <Text variant="h2">Download for offline use?</Text>
        <Text variant="bodySm" color="ink3" style={{ marginTop: 8 }}>
          Real 3D models and top-down plan artwork — {formatBytes(totalBytes)} in total. Once
          downloaded, your designs look the same with no connection at all.
        </Text>
        <Text variant="label" color="ink3" style={{ marginTop: 12 }}>
          Wi-Fi only. You can pause it any time, and change this later in Settings.
        </Text>

        <Button onPress={onDownload} style={{ marginTop: 20 }}>
          {`Download now (${formatBytes(totalBytes)})`}
        </Button>
        <Button variant="secondary" onPress={onOnDemand} style={{ marginTop: 10 }}>
          Only when I place an item
        </Button>
        <Pressable onPress={onLater} style={{ paddingVertical: 14, alignItems: 'center' }}>
          <Text variant="bodySm" color="ink3">Not now</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
