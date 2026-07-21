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
          minHeight: 38,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {/* Let the pill center a naturally-padded single line. Forcing
          includeFontPadding:false + a tight lineHeight was clipping the custom
          font on Android badly enough that the label looked blank. */}
      <Text variant="label" color={active ? 'bg' : 'ink2'} numberOfLines={1} align="center">
        {label}
      </Text>
    </Pressable>
  );
}
