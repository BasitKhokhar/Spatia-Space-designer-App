import { Pressable } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import Text from './Text';

// Filter/category chip. Active = ink fill (light) / ink fill inverse handled by tokens.
export default function Chip({ label, active = false, onPress, style }) {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          backgroundColor: active ? colors.ink : colors.surface,
          borderWidth: active ? 0 : 1,
          borderColor: colors.line,
          paddingHorizontal: 16,
          paddingVertical: 9,
          borderRadius: radius.pill,
        },
        style,
      ]}
    >
      <Text variant="label" color={active ? 'bg' : 'ink2'}>
        {label}
      </Text>
    </Pressable>
  );
}
