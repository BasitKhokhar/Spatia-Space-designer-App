import { ScrollView, Pressable, View } from 'react-native';

import Text from '@/components/ui/Text';
import Icon from '@/components/icons/Icon';
import { useTheme } from '@/theme/useTheme';

// Horizontal category picker for the premade-design catalog. Selecting is the
// first step of browsing designs, so it stays on screen above the results
// instead of costing the user a screen of its own.
export default function CategoryRail({
  categories,
  activeKey,
  onSelect,
  counts = {},
  style,
  contentStyle,
}) {
  const { colors, radius } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={[{ paddingHorizontal: 24, gap: 10 }, contentStyle]}
    >
      {categories.map((c) => {
        const active = c.key === activeKey;
        const count = counts[c.key];
        return (
          <Pressable
            key={c.key}
            onPress={() => onSelect(c.key)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingLeft: 12,
              paddingRight: 15,
              height: 44,
              borderRadius: radius.pill,
              borderWidth: 1.5,
              borderColor: active ? colors.accent : colors.line,
              backgroundColor: active ? colors.accent : colors.surface,
            }}
          >
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: active ? 'rgba(255,255,255,0.20)' : colors.accentSoft,
              }}
            >
              <Icon
                name={c.icon}
                size={15}
                color={active ? colors.onAccent : colors.accent}
                strokeWidth={2}
              />
            </View>
            <Text variant="label" color={active ? 'onAccent' : 'ink'}>
              {c.name}
            </Text>
            {count ? (
              <Text
                variant="label"
                style={{ fontSize: 12, color: active ? 'rgba(255,255,255,0.72)' : colors.ink3 }}
              >
                {count}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
