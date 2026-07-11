import { View, Pressable } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import Text from './Text';
import Icon from '@/components/icons/Icon';

// Back-button header used across secondary screens. Optional title + right slot.
export default function HeaderBar({ title, onBack, right, style }) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 24,
          paddingVertical: 8,
          gap: 14,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={8}
            style={{
              width: 44,
              height: 44,
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
        ) : null}
        {title ? (
          <Text variant="title" numberOfLines={1} style={{ flex: 1 }}>
            {title}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}
