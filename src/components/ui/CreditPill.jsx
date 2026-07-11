import { View, Pressable } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import Text from './Text';

// The credit balance pill with a gold coin, shown in headers.
export default function CreditPill({ count, onPress, style }) {
  const { colors, radius, fonts } = useTheme();

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
          paddingRight: 14,
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
    </Container>
  );
}
