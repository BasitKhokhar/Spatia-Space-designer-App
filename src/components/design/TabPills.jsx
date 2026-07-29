import { ScrollView, Pressable } from 'react-native';

import Text from '@/components/ui/Text';
import { useTheme } from '@/theme/useTheme';

// Story tabs for a design category (Single / Double storey, Ground … N floors).
// Rendered by the caller only when the category actually has more than one.
export default function TabPills({ tabs, activeKey, onSelect, style, contentStyle }) {
  const { colors, radius } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={[{ paddingHorizontal: 24, gap: 8 }, contentStyle]}
    >
      {tabs.map((t) => {
        const active = t.key === activeKey;
        return (
          <Pressable
            key={t.key}
            onPress={() => onSelect(t.key)}
            style={{
              paddingHorizontal: 14,
              height: 34,
              justifyContent: 'center',
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: active ? colors.ink : colors.line,
              backgroundColor: active ? colors.ink : 'transparent',
            }}
          >
            <Text variant="label" color={active ? 'bg' : 'ink2'} style={{ fontSize: 12 }}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
