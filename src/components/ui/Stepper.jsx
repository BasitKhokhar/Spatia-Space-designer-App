import { View, Pressable } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import Text from './Text';
import Icon from '@/components/icons/Icon';

// Labeled +/- stepper used for room dimensions.
export default function Stepper({ label, value, onChange, step = 0.1, min = 0.5, max = 30, unit }) {
  const { colors, radius, fonts } = useTheme();

  const clamp = (v) => Math.min(max, Math.max(min, Math.round(v * 10) / 10));

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radius.lg,
        padding: 16,
      }}
    >
      <Text variant="label" color="ink3">
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 10,
        }}
      >
        <Pressable
          onPress={() => onChange(clamp(value - step))}
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: colors.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="minus" size={20} color={colors.accent} strokeWidth={2.4} />
        </Pressable>
        <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.ink }}>
          {value.toFixed(1)}
          {unit ? <Text style={{ fontSize: 13, color: colors.ink3 }}> {unit}</Text> : null}
        </Text>
        <Pressable
          onPress={() => onChange(clamp(value + step))}
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="plus" size={20} color={colors.onAccent} strokeWidth={2.4} />
        </Pressable>
      </View>
    </View>
  );
}
