import { View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import Card from '@/components/ui/Card';
import Text from '@/components/ui/Text';
import Icon from '@/components/icons/Icon';
import FurnitureGlyph from '@/components/graphics/FurnitureGlyph';
import { useTheme } from '@/theme/useTheme';

// Catalog grid item with an add (+) button.
export default function FurnitureCard({ item, onAdd, style }) {
  const { colors, isDark } = useTheme();
  const from = isDark ? '#241A15' : '#F3E3DA';
  const to = isDark ? '#1A1511' : '#EAD3C6';

  return (
    <Card padded={false} style={[{ overflow: 'hidden' }, style]}>
      <LinearGradient colors={[from, to]} style={{ height: 118, alignItems: 'center', justifyContent: 'center' }}>
        <FurnitureGlyph kind={item.kind} size={78} color={item.colors?.[0]} />
      </LinearGradient>
      <Pressable
        onPress={onAdd}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          width: 28,
          height: 28,
          borderRadius: 9,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="plus" size={16} color={colors.accent} strokeWidth={2.6} />
      </Pressable>
      <View style={{ padding: 12 }}>
        <Text variant="titleSm" numberOfLines={1}>
          {item.name}
        </Text>
        <Text variant="bodySm" color="ink3" style={{ marginTop: 3 }}>
          {item.category}
        </Text>
      </View>
    </Card>
  );
}
