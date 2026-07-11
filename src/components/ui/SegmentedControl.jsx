import { View, Pressable } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import Text from './Text';

// Segmented toggle (e.g. Meters/Feet, Light/Dark/System).
export default function SegmentedControl({ options, value, onChange, style }) {
  const { colors, radius, shadows } = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          backgroundColor: colors.surface2,
          borderRadius: radius.md,
          padding: 3,
        },
        style,
      ]}
    >
      {options.map((opt) => {
        const key = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        const active = key === value;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={[
              {
                flex: 1,
                alignItems: 'center',
                paddingVertical: 9,
                borderRadius: radius.sm,
                backgroundColor: active ? colors.surface : 'transparent',
              },
              active && shadows.e1,
            ]}
          >
            <Text variant="label" color={active ? 'ink' : 'ink3'}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
