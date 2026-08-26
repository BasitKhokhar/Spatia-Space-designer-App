import { View, Pressable } from 'react-native';

import Card from '@/components/ui/Card';
import Text from '@/components/ui/Text';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';

// Only rendered by the caller when the user's tier is 'free'.
export default function UpgradeBanner({ onPress, style }) {
  const { colors, radius } = useTheme();

  return (
    <Card style={[{ flexDirection: 'row', alignItems: 'center', gap: 14 }, style]}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: radius.md,
          backgroundColor: colors.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="gem" size={22} color={colors.accent} strokeWidth={1.8} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="titleSm" color="accent">
          Upgrade to Pro
        </Text>
        <Text variant="bodySm" color="ink2" style={{ marginTop: 2 }}>
          Unlock premium designs, unlimited renders and exclusive furniture collections.
        </Text>
      </View>
      <Pressable
        onPress={onPress}
        hitSlop={6}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: radius.pill,
          backgroundColor: pressed ? colors.accentSoft : 'transparent',
        })}
      >
        <Text variant="label" color="accent" style={{ fontSize: 13 }}>
          Upgrade
        </Text>
        <Icon name="arrow-right" size={14} color={colors.accent} strokeWidth={2.4} />
      </Pressable>
    </Card>
  );
}
