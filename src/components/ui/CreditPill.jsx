import { View, Pressable } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import Icon from '@/components/icons/Icon';
import Text from './Text';

// The credit balance pill with a gold coin, shown in headers. `onAdd` renders
// a small fused "+" affordance at the trailing edge; defaults to `onPress` so
// existing call sites keep working with a single destination for both taps.
export default function CreditPill({ count, onPress, onAdd, style }) {
  const { colors, radius, fonts, shadows } = useTheme();

  const Container = onPress ? Pressable : View;
  return (
    <Container
      onPress={onPress}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 7,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: radius.pill,
          paddingVertical: 8,
          paddingLeft: 10,
          paddingRight: 6,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: colors.credit,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 12 }}>🪙</Text>
      </View>
      <Text style={{ fontFamily: fonts.display, fontSize: 15, color: colors.ink }}>{count}</Text>
      <Pressable
        onPress={onAdd || onPress}
        hitSlop={8}
        style={[
          {
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 2,
          },
          shadows.accent,
        ]}
      >
        <Icon name="plus" size={13} color={colors.onAccent} strokeWidth={2.6} />
      </Pressable>
    </Container>
  );
}
