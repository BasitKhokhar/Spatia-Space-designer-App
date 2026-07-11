import { View } from 'react-native';

import Screen from '@/components/ui/Screen';
import Text from '@/components/ui/Text';
import Button from '@/components/ui/Button';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';

// Full-screen offline gate. `onRetry` re-checks connectivity.
export default function OfflineScreen({ onRetry }) {
  const { colors, radius } = useTheme();
  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
        <View
          style={{
            width: 110,
            height: 110,
            borderRadius: radius.xxl,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.line,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="wifi-off" size={52} color={colors.ink3} strokeWidth={1.8} />
        </View>
        <Text variant="h2" align="center" style={{ marginTop: 28 }}>
          You&apos;re offline
        </Text>
        <Text variant="body" color="ink2" align="center" style={{ marginTop: 10 }}>
          Check your connection to sync projects, browse the catalog, or export designs.
        </Text>
        <Button title="Try Again" icon="rotate" iconPosition="left" variant="dark" onPress={onRetry} fullWidth={false} style={{ marginTop: 26 }} />
        <Text variant="bodySm" color="ink3" align="center" style={{ marginTop: 20 }}>
          Some saved projects are still viewable offline
        </Text>
      </View>
    </Screen>
  );
}
