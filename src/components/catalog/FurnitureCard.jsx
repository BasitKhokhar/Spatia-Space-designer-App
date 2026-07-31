import { View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import Card from '@/components/ui/Card';
import Text from '@/components/ui/Text';
import Icon from '@/components/icons/Icon';
import FurnitureGlyph from '@/components/graphics/FurnitureGlyph';
import { useTheme } from '@/theme/useTheme';

// Catalog grid item. Free items show an add (+) button; premium items that are
// still locked show a "watch ad to unlock" badge instead. The parent decides
// what tapping does (add vs. run the unlock flow) via `onAdd`.
export default function FurnitureCard({ item, onAdd, locked = false, style }) {
  const { colors, isDark } = useTheme();
  const from = isDark ? '#241A15' : '#F3E3DA';
  const to = isDark ? '#1A1511' : '#EAD3C6';

  return (
    <Card padded={false} style={[{ overflow: 'hidden' }, style]}>
      <LinearGradient colors={[from, to]} style={{ height: 118, alignItems: 'center', justifyContent: 'center' }}>
        <FurnitureGlyph kind={item.kind} catalogId={item.id} size={78} color={item.colors?.[0]} />
      </LinearGradient>
      <Pressable
        onPress={onAdd}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          minWidth: 28,
          height: 28,
          paddingHorizontal: locked ? 8 : 0,
          borderRadius: 9,
          backgroundColor: locked ? colors.credit : colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 4,
        }}
      >
        {locked ? (
          <>
            <Icon name="lock" size={12} color="#fff" strokeWidth={2.2} />
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>Ad</Text>
          </>
        ) : (
          <Icon name="plus" size={16} color={colors.accent} strokeWidth={2.6} />
        )}
      </Pressable>
      <View style={{ padding: 12 }}>
        <Text variant="titleSm" numberOfLines={1}>
          {item.name}
        </Text>
        <Text variant="bodySm" color="ink3" style={{ marginTop: 3 }}>
          {locked ? 'Premium · unlock with an ad' : item.category}
        </Text>
      </View>
    </Card>
  );
}
